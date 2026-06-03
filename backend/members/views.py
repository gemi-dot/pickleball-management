from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q

from .models import Member
from .serializers import MemberSerializer, MemberDetailSerializer
from bookings.serializers import BookingTimelineSerializer


class MemberViewSet(viewsets.ModelViewSet):
	queryset = Member.objects.all()
	serializer_class = MemberSerializer

	def get_queryset(self):
		queryset = super().get_queryset()
		params = self.request.query_params

		is_active = params.get("is_active")
		membership_tier = params.get("membership_tier")
		search = params.get("search")

		if is_active is not None:
			normalized = is_active.lower()
			if normalized in {"true", "1", "yes"}:
				queryset = queryset.filter(is_active=True)
			elif normalized in {"false", "0", "no"}:
				queryset = queryset.filter(is_active=False)

		if membership_tier:
			queryset = queryset.filter(membership_tier=membership_tier)

		if search:
			queryset = queryset.filter(
				Q(first_name__icontains=search)
				| Q(last_name__icontains=search)
				| Q(email__icontains=search)
			)

		return queryset

	def get_serializer_class(self):
		"""Use MemberDetailSerializer for detail view, regular serializer for list."""
		if self.action == "retrieve":
			return MemberDetailSerializer
		return super().get_serializer_class()

	@action(detail=True, methods=["get"])
	def timeline(self, request, pk=None):
		"""Get member's complete activity timeline (bookings, attendance, payments)."""
		member = self.get_object()
		bookings = member.bookings.all().order_by("-start_time")
		serializer = BookingTimelineSerializer(bookings, many=True)
		return Response(serializer.data)
