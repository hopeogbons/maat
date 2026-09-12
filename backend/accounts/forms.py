from django.contrib.auth.forms import AuthenticationForm


class MaatAuthenticationForm(AuthenticationForm):
    """Django's login form with placeholders and autocomplete hints for the styled page."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["username"].widget.attrs.update(
            {"placeholder": "Your username", "autocomplete": "username", "autofocus": True}
        )
        self.fields["password"].widget.attrs.update(
            {"placeholder": "Your password", "autocomplete": "current-password"}
        )
