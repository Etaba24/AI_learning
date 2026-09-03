from django.contrib import admin

from .models import Choice, Exercice, Question, Quiz


class ChoiceInline(admin.TabularInline):
    model = Choice
    extra = 2


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ("__str__", "quiz", "ordre")
    inlines = [ChoiceInline]


class QuestionInline(admin.TabularInline):
    model = Question
    extra = 1
    show_change_link = True


@admin.register(Quiz)
class QuizAdmin(admin.ModelAdmin):
    list_display = ("titre", "lecon", "module", "seuil_reussite")
    inlines = [QuestionInline]


@admin.register(Exercice)
class ExerciceAdmin(admin.ModelAdmin):
    list_display = ("__str__", "lecon")
