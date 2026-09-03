from django.contrib import admin

from .models import JournalActivite


@admin.register(JournalActivite)
class JournalActiviteAdmin(admin.ModelAdmin):
    list_display = ("action", "utilisateur", "created_at")
    list_filter = ("action",)
    search_fields = ("action", "detail", "utilisateur__email")
    readonly_fields = ("action", "utilisateur", "detail", "created_at", "updated_at")

    def has_add_permission(self, request):
        # Le journal ne se remplit que par le code (log_activity), jamais à la main.
        return False
