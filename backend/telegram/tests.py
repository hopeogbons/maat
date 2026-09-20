"""The Telegram bridge: connected from the dashboard, answered like the widget."""

from unittest import mock

from django.test import TestCase, override_settings

from ai.phrases import PHRASES
from telegram.models import TelegramBot
from verification.models import Conversation


def _text_update(text, chat_id=42, language="en", update_id=1):
    return {
        "update_id": update_id,
        "message": {"message_id": 1, "chat": {"id": chat_id, "type": "private"}, "from": {"id": 7, "language_code": language}, "text": text},
    }


class ConnectTests(TestCase):
    def setUp(self):
        from django.contrib.auth import get_user_model

        self.user = get_user_model().objects.create_user(username="staff", password="x" * 12)
        self.client.force_login(self.user)

    def test_signing_in_is_required(self):
        self.client.logout()
        self.assertIn(self.client.get("/api/telegram/").status_code, (401, 403))

    def test_connecting_checks_the_token_registers_the_webhook_and_keeps_the_token_to_itself(self):
        with (
            mock.patch("telegram.client.get_me", return_value={"username": "maat_bot"}) as me,
            mock.patch("telegram.client.set_webhook") as hook,
        ):
            response = self.client.put("/api/telegram/", {"token": "123:abc"}, content_type="application/json")
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertTrue(body["connected"])
        self.assertEqual(body["username"], "maat_bot")
        self.assertNotIn("token", body)
        self.assertNotIn("123:abc", str(body))
        me.assert_called_once_with("123:abc")
        url, secret = hook.call_args.args[1], hook.call_args.args[2]
        self.assertTrue(url.endswith("/api/telegram/webhook/"))
        bot = TelegramBot.current()
        self.assertEqual(bot.webhook_secret, secret)
        self.assertEqual(bot.token, "123:abc")

    def test_a_token_in_the_environment_connects_without_a_paste(self):
        with (
            override_settings(TELEGRAM_BOT_TOKEN="555:env"),
            mock.patch("telegram.client.get_me", return_value={"username": "maat_bot"}),
            mock.patch("telegram.client.set_webhook"),
        ):
            self.assertTrue(self.client.get("/api/telegram/").json()["hasEnvToken"])
            response = self.client.put("/api/telegram/", {}, content_type="application/json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(TelegramBot.current().token, "555:env")

    def test_a_refused_token_is_reported_not_kept(self):
        from telegram.client import TelegramError

        with mock.patch("telegram.client.get_me", side_effect=TelegramError("Unauthorized")):
            response = self.client.put("/api/telegram/", {"token": "123:bad"}, content_type="application/json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("Unauthorized", response.json()["detail"])
        self.assertFalse(TelegramBot.current().connected)

    def test_disconnecting_forgets_everything(self):
        TelegramBot.objects.create(token="123:abc", username="maat_bot", webhook_secret="s")
        with mock.patch("telegram.client.delete_webhook") as gone:
            response = self.client.delete("/api/telegram/")
        self.assertFalse(response.json()["connected"])
        gone.assert_called_once_with("123:abc")
        self.assertEqual(TelegramBot.current().token, "")


class WebhookTests(TestCase):
    def setUp(self):
        from appsettings.models import CountryCoverage
        from core.models import Country

        self.bot = TelegramBot.objects.create(token="123:abc", username="maat_bot", webhook_secret="hush")
        # Nigeria is covered, so "Lagos" names the country and the claim is
        # weighed at once rather than asked about.
        ng = Country.objects.create(name="Nigeria", iso2="NG", iso3="NGA", numeric_code="566")
        CountryCoverage.objects.create(country=ng, is_active=True)

    def _post(self, update, secret="hush"):
        return self.client.post(
            "/api/telegram/webhook/", update, content_type="application/json", HTTP_X_TELEGRAM_BOT_API_SECRET_TOKEN=secret
        )

    def test_an_update_without_the_secret_is_refused(self):
        with mock.patch("telegram.client.send_message") as send:
            self.assertEqual(self._post(_text_update("hello"), secret="wrong").status_code, 403)
        send.assert_not_called()

    def test_a_text_message_is_answered_in_the_persons_language(self):
        with mock.patch("telegram.client.send_message") as send, mock.patch("telegram.client.send_chat_action"):
            response = self._post(_text_update("I heard fuel prices in Lagos go up by 40%", language="ha"))
        self.assertEqual(response.status_code, 200)
        conversation = Conversation.objects.get(session_key="telegram:42")
        self.assertEqual(conversation.language, "ha")
        chat_id, text = send.call_args.args[1], send.call_args.args[2]
        self.assertEqual(chat_id, 42)
        self.assertTrue(text)
        # The consent question's answers come as buttons, in Hausa.
        choices = send.call_args.kwargs["choices"]
        self.assertEqual([c["label"] for c in choices], [PHRASES["ha"]["yes"], PHRASES["ha"]["no"]])
        self.assertEqual(TelegramBot.current().messages, 1)

    def test_start_gets_the_greeting_and_a_tapped_button_is_an_answer(self):
        with mock.patch("telegram.client.send_message") as send, mock.patch("telegram.client.send_chat_action"):
            self._post(_text_update("/start", language="sw"))
            self.assertEqual(send.call_args.args[2], PHRASES["sw"]["greeting"])
            self._post(_text_update("I heard fuel prices in Lagos go up by 40%"))
            with mock.patch("telegram.client.answer_callback") as answered:
                tapped = {
                    "update_id": 3,
                    "callback_query": {"id": "cb1", "from": {"id": 7, "language_code": "en"}, "data": "Yes", "message": {"chat": {"id": 42}}},
                }
                self._post(tapped)
            answered.assert_called_once()
        self.assertGreaterEqual(Conversation.objects.get(session_key="telegram:42").turns.count(), 4)

    def test_a_voice_note_is_transcribed_and_answered_with_a_voice_note(self):
        from ai.speech import Transcript

        voice = {
            "update_id": 4,
            "message": {"message_id": 2, "chat": {"id": 43}, "from": {"id": 8, "language_code": "yo"}, "voice": {"file_id": "f1", "duration": 3}},
        }
        with (
            mock.patch("telegram.client.download_file", return_value=(b"OggS....", "file_1.oga")) as fetched,
            mock.patch("telegram.webhook.transcribe", return_value=Transcript("Fuel prices in Lagos go up by 40%", "yo")) as ears,
            mock.patch("telegram.webhook.speak", return_value=b"OggSreply") as mouth,
            mock.patch("telegram.client.send_message") as send,
            mock.patch("telegram.client.send_voice") as voiced,
            mock.patch("telegram.client.send_chat_action"),
        ):
            self.assertEqual(self._post(voice).status_code, 200)
        fetched.assert_called_once_with("123:abc", "f1")
        self.assertEqual(ears.call_args.kwargs["language"], "yo")
        self.assertEqual(mouth.call_args.kwargs["format"], "opus")
        send.assert_called_once()
        voiced.assert_called_once_with("123:abc", 43, b"OggSreply")

    def test_a_note_nobody_could_hear_is_said_so(self):
        voice = {"update_id": 5, "message": {"chat": {"id": 44}, "from": {"language_code": "ha"}, "voice": {"file_id": "f2"}}}
        with (
            mock.patch("telegram.client.download_file", return_value=(b"OggS", "f.oga")),
            mock.patch("telegram.client.send_message") as send,
            mock.patch("telegram.client.send_chat_action"),
        ):
            self._post(voice)
        self.assertEqual(send.call_args.args[2], PHRASES["ha"]["could_not_listen"])
        self.assertFalse(Conversation.objects.filter(session_key="telegram:44").exists())

    @override_settings(TELEGRAM_API_BASE="https://example.invalid")
    def test_a_message_that_cannot_be_sent_never_becomes_a_retry(self):
        from telegram.client import TelegramError

        with mock.patch("telegram.client.send_message", side_effect=TelegramError("down")), mock.patch("telegram.client.send_chat_action"):
            self.assertEqual(self._post(_text_update("hello")).status_code, 200)
