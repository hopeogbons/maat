from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase, RequestFactory

from core.context import CurrentUserMiddleware, get_current_user
from core.models import Country, Currency, StateProvince, TimeZone


class BaseModelTests(TestCase):
    """Soft delete and the audit columns, exercised through a real model."""

    @classmethod
    def setUpTestData(cls):
        cls.user = get_user_model().objects.create_user(username="scribe", password="x")
        cls.currency = Currency.objects.create(code="NGN", name="Naira")

    def test_delete_retires_the_row_instead_of_erasing_it(self):
        self.currency.delete()
        self.assertFalse(Currency.active.filter(code="NGN").exists())
        row = Currency.objects.get(code="NGN")
        self.assertIsNotNone(row.deleted_at)

    def test_hard_delete_really_removes_it(self):
        self.currency.delete(hard=True)
        self.assertFalse(Currency.objects.filter(code="NGN").exists())

    def test_restore_brings_it_back(self):
        self.currency.delete()
        Currency.objects.get(code="NGN").restore()
        self.assertTrue(Currency.active.filter(code="NGN").exists())

    def test_queryset_delete_is_also_soft(self):
        Currency.objects.filter(code="NGN").delete()
        self.assertTrue(Currency.objects.filter(code="NGN").exists())
        self.assertFalse(Currency.active.filter(code="NGN").exists())

    def test_audit_columns_follow_the_request_user(self):
        request = RequestFactory().get("/")
        request.user = self.user
        seen = {}

        def view(_request):
            row = Currency.objects.create(code="KES", name="Shilling")
            seen["created_by"] = row.created_by
            seen["current"] = get_current_user()

            class Response:
                pass

            return Response()

        CurrentUserMiddleware(view)(request)
        self.assertEqual(seen["created_by"], self.user)
        self.assertEqual(seen["current"], self.user)
        # The context is cleared once the request is done.
        self.assertIsNone(get_current_user())

    def test_rows_made_outside_a_request_belong_to_the_system(self):
        self.assertIsNone(Currency.objects.create(code="GHS", name="Cedi").created_by)


class CatalogueSeedTests(TestCase):
    """The seeds are run for real: the data ships with the machine."""

    @classmethod
    def setUpTestData(cls):
        call_command("seed_currencies_and_timezones", verbosity=0)
        call_command("sync_countries_and_states", verbosity=0)

    def test_currencies_and_timezones_are_seeded(self):
        self.assertGreater(Currency.objects.count(), 150)
        self.assertGreater(TimeZone.objects.count(), 400)
        self.assertEqual(Currency.objects.get(code="JPY").minor_units, 0)
        self.assertEqual(Currency.objects.get(code="BHD").minor_units, 3)

    def test_each_currency_carries_its_own_symbol_not_a_foreign_reading(self):
        # CLDR only knows a symbol inside a locale, so each is asked at home.
        self.assertEqual(Currency.objects.get(code="NGN").symbol, "₦")
        self.assertEqual(Currency.objects.get(code="USD").symbol, "$")
        self.assertEqual(Currency.objects.get(code="GBP").symbol, "£")

    def test_countries_carry_their_codes_flag_and_currency(self):
        nigeria = Country.objects.get(iso2="NG")
        self.assertEqual(nigeria.iso3, "NGA")
        self.assertEqual(nigeria.numeric_code, "566")
        self.assertEqual(nigeria.phone_code, "+234")
        self.assertEqual(nigeria.flag_emoji, "\U0001f1f3\U0001f1ec")
        self.assertEqual(nigeria.currency.code, "NGN")

    def test_common_names_are_preferred_over_formal_ones(self):
        self.assertEqual(Country.objects.get(iso2="KR").name, "South Korea")

    def test_subdivisions_are_seeded_under_their_country(self):
        kano = StateProvince.objects.get(code="NG-KN")
        self.assertEqual(kano.name, "Kano")
        self.assertEqual(kano.country.iso2, "NG")
        self.assertEqual(kano.kind, "State")

    def test_running_the_seeds_again_changes_nothing(self):
        before = (Currency.objects.count(), Country.objects.count(), StateProvince.objects.count())
        call_command("seed_currencies_and_timezones", verbosity=0)
        call_command("sync_countries_and_states", verbosity=0)
        after = (Currency.objects.count(), Country.objects.count(), StateProvince.objects.count())
        self.assertEqual(before, after)
