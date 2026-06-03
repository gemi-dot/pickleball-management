from rest_framework import viewsets

from .models import Court
from .serializers import CourtSerializer


class CourtViewSet(viewsets.ModelViewSet):
	queryset = Court.objects.all()
	serializer_class = CourtSerializer
