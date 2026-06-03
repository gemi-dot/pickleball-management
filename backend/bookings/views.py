from rest_framework import viewsets

from .models import Booking
from .serializers import BookingSerializer


class BookingViewSet(viewsets.ModelViewSet):
	queryset = Booking.objects.select_related("court", "member").all()
	serializer_class = BookingSerializer

	def get_queryset(self):
		queryset = super().get_queryset()
		params = self.request.query_params

		court = params.get("court")
		member = params.get("member")
		start_time_after = params.get("start_time_after")
		end_time_before = params.get("end_time_before")

		if court:
			queryset = queryset.filter(court_id=court)
		if member:
			queryset = queryset.filter(member_id=member)
		if start_time_after:
			queryset = queryset.filter(start_time__gte=start_time_after)
		if end_time_before:
			queryset = queryset.filter(end_time__lte=end_time_before)

		return queryset
