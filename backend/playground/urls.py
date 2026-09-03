from django.urls import path

from . import views

urlpatterns = [
    path("playground/languages/", views.PlaygroundLanguagesView.as_view(), name="playground-languages"),
    path("playground/run/", views.PlaygroundRunView.as_view(), name="playground-run"),
]
