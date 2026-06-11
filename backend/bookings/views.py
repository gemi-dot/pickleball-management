from datetime import datetime, timedelta

from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Booking, Payment
from .serializers import BookingSerializer, PaymentSerializer
from courts.models import Court


class BookingViewSet(viewsets.ModelViewSet):
	queryset = Booking.objects.select_related("court", "member").prefetch_related("payments").all()
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

	@action(detail=False, methods=["get"], url_path="availability")
	def availability(self, request):
		date_str = request.query_params.get("date")
		duration_raw = request.query_params.get("duration_hours", "2")
		players_raw = request.query_params.get("players_count")

		try:
			duration_hours = int(duration_raw)
		except (TypeError, ValueError):
			return Response(
				{"detail": "duration_hours must be an integer"},
				status=status.HTTP_400_BAD_REQUEST,
			)

		if duration_hours < 1 or duration_hours > 4:
			return Response(
				{"detail": "duration_hours must be between 1 and 4"},
				status=status.HTTP_400_BAD_REQUEST,
			)

		players_count = None
		if players_raw is not None and players_raw != "":
			try:
				players_count = int(players_raw)
			except (TypeError, ValueError):
				return Response(
					{"detail": "players_count must be an integer"},
					status=status.HTTP_400_BAD_REQUEST,
				)

		if date_str:
			try:
				slot_date = datetime.strptime(date_str, "%Y-%m-%d").date()
			except ValueError:
				return Response(
					{"detail": "date must be in YYYY-MM-DD format"},
					status=status.HTTP_400_BAD_REQUEST,
				)
		else:
			slot_date = timezone.localdate()

		courts_qs = Court.objects.exclude(status=Court.STATUS_MAINTENANCE).order_by("name")
		if players_count is not None:
			courts_qs = courts_qs.filter(max_players__gte=players_count)

		courts = list(courts_qs)
		if not courts:
			return Response(
				{
					"date": slot_date.isoformat(),
					"duration_hours": duration_hours,
					"players_count": players_count,
					"slots": [],
				}
			)

		open_hour = min(court.operating_open_time.hour for court in courts)
		close_hour = max(court.operating_close_time.hour for court in courts)

		day_start = timezone.make_aware(datetime.combine(slot_date, datetime.min.time()))
		day_end = day_start + timedelta(days=1)

		relevant_bookings = (
			Booking.objects.filter(
				court_id__in=[court.id for court in courts],
				status=Booking.STATUS_CONFIRMED,
				start_time__lt=day_end,
				end_time__gt=day_start,
			)
			.values("court_id", "start_time", "end_time")
		)

		bookings_by_court = {}
		for booking in relevant_bookings:
			bookings_by_court.setdefault(booking["court_id"], []).append(
				(booking["start_time"], booking["end_time"])
			)

		slots = []
		last_start_hour = close_hour - duration_hours
		for hour in range(open_hour, last_start_hour + 1):
			slot_start = timezone.make_aware(
				datetime.combine(slot_date, datetime.min.time().replace(hour=hour))
			)
			slot_end = slot_start + timedelta(hours=duration_hours)

			available_courts = []
			for court in courts:
				court_open_hour = court.operating_open_time.hour
				court_close_hour = court.operating_close_time.hour
				if hour < court_open_hour or (hour + duration_hours) > court_close_hour:
					continue

				conflicts = bookings_by_court.get(court.id, [])
				has_overlap = any(
					start < slot_end and end > slot_start for start, end in conflicts
				)
				if not has_overlap:
					available_courts.append({"id": court.id, "name": court.name})

			slots.append(
				{
					"start_time": slot_start.isoformat(),
					"end_time": slot_end.isoformat(),
					"available_courts": available_courts,
				}
			)

		return Response(
			{
				"date": slot_date.isoformat(),
				"duration_hours": duration_hours,
				"players_count": players_count,
				"slots": slots,
			}
		)


class PaymentViewSet(viewsets.ModelViewSet):
	queryset = Payment.objects.select_related("booking", "booking__member", "booking__court").all()
	serializer_class = PaymentSerializer

	def get_queryset(self):
		queryset = super().get_queryset()
		params = self.request.query_params

		booking = params.get("booking")
		method = params.get("method")
		status_value = params.get("status")
		paid_by = params.get("paid_by")

		if booking:
			queryset = queryset.filter(booking_id=booking)
		if method:
			queryset = queryset.filter(method=method)
		if status_value:
			queryset = queryset.filter(status=status_value)
		if paid_by:
			queryset = queryset.filter(paid_by_id=paid_by)

		return queryset

	def perform_create(self, serializer):
		user = self.request.user
		if user and user.is_authenticated and user.is_staff:
			serializer.save(paid_by=user)
			return

		serializer.save()

	def perform_update(self, serializer):
		user = self.request.user
		if user and user.is_authenticated and user.is_staff and serializer.instance.paid_by_id is None:
			serializer.save(paid_by=user)
			return

		serializer.save()
