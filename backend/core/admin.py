"""The catalogues in the admin: readable, searchable, and not editable by hand.

These rows come from ISO and CLDR through the seed commands. Letting someone
retype a currency code in a form would put the catalogue and its source out of
step with no way to tell which one is wrong, so everything here is read only and
the way to change it is to fix the seed and run it again.
"""

from django.contrib import admin

from core.models import Country, Currency, StateProvince, TimeZone


class ReadOnlyAdmin(admin.ModelAdmin):
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(Currency)
class CurrencyAdmin(ReadOnlyAdmin):
    list_display = ("code", "name", "symbol", "minor_units")
    search_fields = ("code", "name")
    ordering = ("code",)


@admin.register(TimeZone)
class TimeZoneAdmin(ReadOnlyAdmin):
    list_display = ("name",)
    search_fields = ("name",)
    ordering = ("name",)


@admin.register(Country)
class CountryAdmin(ReadOnlyAdmin):
    list_display = ("flag_emoji", "name", "iso2", "iso3", "phone_code", "currency")
    list_display_links = ("name",)
    search_fields = ("name", "iso2", "iso3")
    list_filter = ("currency",)
    ordering = ("name",)


@admin.register(StateProvince)
class StateProvinceAdmin(ReadOnlyAdmin):
    list_display = ("name", "code", "kind", "country")
    search_fields = ("name", "code")
    list_filter = ("country",)
    ordering = ("country__name", "name")
