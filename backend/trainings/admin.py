from django.contrib import admin

from .models import Category, Formation, Lecon, Module, Ressource


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("nom",)
    search_fields = ("nom",)


class ModuleInline(admin.TabularInline):
    model = Module
    extra = 1
    show_change_link = True


@admin.register(Formation)
class FormationAdmin(admin.ModelAdmin):
    list_display = ("titre", "categorie", "auteur", "statut", "niveau", "duree_heures")
    list_filter = ("statut", "niveau", "categorie")
    search_fields = ("titre", "description")
    inlines = [ModuleInline]


class LeconInline(admin.TabularInline):
    model = Lecon
    extra = 1
    show_change_link = True


@admin.register(Module)
class ModuleAdmin(admin.ModelAdmin):
    list_display = ("titre", "formation", "ordre")
    list_filter = ("formation",)
    inlines = [LeconInline]


class RessourceInline(admin.TabularInline):
    model = Ressource
    extra = 1


@admin.register(Lecon)
class LeconAdmin(admin.ModelAdmin):
    list_display = ("titre", "module", "ordre")
    list_filter = ("module__formation",)
    inlines = [RessourceInline]


@admin.register(Ressource)
class RessourceAdmin(admin.ModelAdmin):
    list_display = ("nom", "type", "lecon")
