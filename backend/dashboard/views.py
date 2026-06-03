from datetime import timedelta

from django.db.models import Count, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework.decorators import api_view
from rest_framework.response import Response

from bookings.models import Booking
from courts.models import Court
from members.models import Member


def _parse_period_days(request) -> int:
    period = request.query_params.get("period", "7d")
    supported = {
        "7d": 7,
        "30d": 30,
    }
    return supported.get(period, 7)


def _safe_delta_percent(current: float, previous: float):
    if previous == 0:
        return None
    return round(((current - previous) / previous) * 100, 2)


def _bookings_trend(start_date, end_date):
    rows = (
        Booking.objects.filter(
            status=Booking.STATUS_CONFIRMED,
            start_time__date__range=(start_date, end_date),
        )
        .annotate(day=TruncDate("start_time"))
        .values("day")
        .annotate(count=Count("id"))
        .order_by("day")
    )

    count_by_day = {row["day"]: row["count"] for row in rows}
    total_days = (end_date - start_date).days + 1
    points = []

    for i in range(total_days):
        day = start_date + timedelta(days=i)
        points.append({"date": day.isoformat(), "count": count_by_day.get(day, 0)})

    return points


def _utilization_trend(start_date, end_date):
    total_courts = Court.objects.count()
    total_days = (end_date - start_date).days + 1

    if total_courts == 0:
        return [
            {
                "date": (start_date + timedelta(days=i)).isoformat(),
                "percentage": 0,
            }
            for i in range(total_days)
        ]

    rows = (
        Booking.objects.filter(
            status=Booking.STATUS_CONFIRMED,
            start_time__date__range=(start_date, end_date),
        )
        .annotate(day=TruncDate("start_time"))
        .values("day")
        .annotate(courts_booked=Count("court", distinct=True))
        .order_by("day")
    )

    utilization_by_day = {
        row["day"]: round((row["courts_booked"] / total_courts) * 100, 2) for row in rows
    }

    points = []
    for i in range(total_days):
        day = start_date + timedelta(days=i)
        points.append({"date": day.isoformat(), "percentage": utilization_by_day.get(day, 0)})

    return points


def _parse_heatmap_period_days(request) -> int:
    period = request.query_params.get("period", "7d")
    supported = {
        "7d": 7,
        "30d": 30,
    }
    return supported.get(period, 7)

def calculate_utilization():
    """
    Calculate court utilization percentage based on confirmed bookings.
    Returns utilization as a percentage (0-100).
    """
    total_courts = Court.objects.count()
    if total_courts == 0:
        return 0
    
    # Count courts with confirmed bookings today
    today = timezone.now().date()
    courts_with_bookings = Booking.objects.filter(
        start_time__date=today,
        status='confirmed'
    ).values('court').distinct().count()
    
    return round((courts_with_bookings / total_courts) * 100, 2)


@api_view(['GET'])
def dashboard_metrics(request):
    today = timezone.localdate()
    period_days = _parse_period_days(request)
    period_start = today - timedelta(days=period_days - 1)
    previous_period_end = period_start - timedelta(days=1)
    previous_period_start = previous_period_end - timedelta(days=period_days - 1)

    total_bookings = Booking.objects.filter(start_time__date=today).count()
    court_utilization = calculate_utilization()
    active_members = Member.objects.filter(is_active=True).count()
    pending_waitlist = Booking.objects.filter(status=Booking.STATUS_WAITLIST).count()

    revenue_mtd = Booking.objects.filter(
        start_time__date__gte=timezone.now() - timedelta(days=30),
        status=Booking.STATUS_CONFIRMED,
        is_paid=True,
    ).aggregate(total=Sum("fee_amount"))["total"] or 0

    outstanding_amount = Booking.objects.filter(
        status=Booking.STATUS_CONFIRMED,
        is_paid=False,
    ).aggregate(total=Sum("fee_amount"))["total"] or 0

    paid_count = Booking.objects.filter(
        status=Booking.STATUS_CONFIRMED,
        is_paid=True,
        start_time__date__gte=timezone.now() - timedelta(days=30),
    ).count()

    average_booking_value = round(float(revenue_mtd) / paid_count, 2) if paid_count else 0

    current_period_confirmed = Booking.objects.filter(
        status=Booking.STATUS_CONFIRMED,
        start_time__date__range=(period_start, today),
    ).count()
    previous_period_confirmed = Booking.objects.filter(
        status=Booking.STATUS_CONFIRMED,
        start_time__date__range=(previous_period_start, previous_period_end),
    ).count()

    bookings_trend = _bookings_trend(period_start, today)
    utilization_trend = _utilization_trend(period_start, today)

    current_utilization_avg = round(
        sum(item["percentage"] for item in utilization_trend) / max(len(utilization_trend), 1),
        2,
    )

    previous_utilization_trend = _utilization_trend(previous_period_start, previous_period_end)
    previous_utilization_avg = round(
        sum(item["percentage"] for item in previous_utilization_trend)
        / max(len(previous_utilization_trend), 1),
        2,
    )

    return Response({
        'total_bookings': total_bookings,
        'court_utilization': court_utilization,
        'active_members': active_members,
        'pending_waitlist': pending_waitlist,
        'revenue_mtd': revenue_mtd,
        'outstanding_amount': outstanding_amount,
        'average_booking_value': average_booking_value,
        'period': f'{period_days}d',
        'period_start': period_start.isoformat(),
        'period_end': today.isoformat(),
        'period_confirmed_bookings': current_period_confirmed,
        'bookings_delta_pct': _safe_delta_percent(current_period_confirmed, previous_period_confirmed),
        'utilization_avg_pct': current_utilization_avg,
        'utilization_delta_pct': _safe_delta_percent(current_utilization_avg, previous_utilization_avg),
        'trends': {
            'bookings': bookings_trend,
            'utilization': utilization_trend,
        },
    })

@api_view(['GET'])
def court_occupancy(request):
    """Real-time court status for next 8 hours"""
    now = timezone.now()
    slots = []
    for hour in range(8, 20):  # 8 AM to 8 PM
        slot_time = now.replace(hour=hour, minute=0, second=0)
        bookings = Booking.objects.filter(
            start_time__lte=slot_time + timedelta(hours=1),
            end_time__gte=slot_time,
            status=Booking.STATUS_CONFIRMED,
        ).values('court__name', 'court__status')
        
        slots.append({
            'time': slot_time.strftime('%I %p'),
            'courts': list(bookings)
        })
    return Response(slots)


@api_view(['GET'])
def booking_heatmap(request):
    """Return booking intensity heatmap for selected period and operating hours."""
    today = timezone.localdate()
    period_days = _parse_heatmap_period_days(request)
    start_date = today - timedelta(days=period_days - 1)

    bookings = Booking.objects.filter(
        status=Booking.STATUS_CONFIRMED,
        start_time__date__range=(start_date, today),
    )

    count_by_day_hour = {}
    for booking in bookings:
        local_start = timezone.localtime(booking.start_time)
        key = (local_start.date().isoformat(), local_start.hour)
        count_by_day_hour[key] = count_by_day_hour.get(key, 0) + 1

    hours = list(range(8, 21))
    days = []
    max_count = 0

    for offset in range(period_days):
        day = start_date + timedelta(days=offset)
        row = {
            "date": day.isoformat(),
            "weekday": day.strftime("%a"),
            "slots": [],
        }
        for hour in hours:
            count = count_by_day_hour.get((day.isoformat(), hour), 0)
            max_count = max(max_count, count)
            row["slots"].append({"hour": hour, "count": count})
        days.append(row)

    return Response(
        {
            "period": f"{period_days}d",
            "start_date": start_date.isoformat(),
            "end_date": today.isoformat(),
            "hours": hours,
            "max_count": max_count,
            "days": days,
        }
    )


@api_view(["GET"])
def operational_alerts(request):
    """Return key operational alerts for the dashboard."""
    today = timezone.localdate()
    tomorrow = today + timedelta(days=1)

    waitlist_threshold = 3
    cancellation_threshold = 2

    pending_waitlist = Booking.objects.filter(status=Booking.STATUS_WAITLIST).count()
    cancelled_today = Booking.objects.filter(
        status=Booking.STATUS_CANCELLED,
        start_time__date=today,
    ).count()
    maintenance_courts = Court.objects.filter(status=Court.STATUS_MAINTENANCE).count()
    unpaid_confirmed = Booking.objects.filter(
        status=Booking.STATUS_CONFIRMED,
        is_paid=False,
    ).count()
    upcoming_in_24h = Booking.objects.filter(
        status=Booking.STATUS_CONFIRMED,
        start_time__date__gte=today,
        start_time__date__lt=tomorrow,
    ).count()

    alerts = []

    if pending_waitlist >= waitlist_threshold:
        alerts.append(
            {
                "id": "waitlist_high",
                "level": "warning",
                "title": "Waitlist is high",
                "message": f"{pending_waitlist} bookings are currently on waitlist.",
                "link": "/bookings?status=waitlist",
            }
        )

    if cancelled_today >= cancellation_threshold:
        alerts.append(
            {
                "id": "cancelled_spike",
                "level": "warning",
                "title": "Cancellation spike today",
                "message": f"{cancelled_today} bookings were cancelled today.",
                "link": "/bookings?status=cancelled&scope=today",
            }
        )

    if maintenance_courts > 0:
        alerts.append(
            {
                "id": "maintenance_courts",
                "level": "info",
                "title": "Courts under maintenance",
                "message": f"{maintenance_courts} courts are unavailable due to maintenance.",
                "link": "/courts?status=maintenance",
            }
        )

    if unpaid_confirmed > 0:
        alerts.append(
            {
                "id": "unpaid_confirmed",
                "level": "warning",
                "title": "Unpaid confirmed bookings",
                "message": f"{unpaid_confirmed} confirmed bookings are not marked paid.",
                "link": "/bookings?status=confirmed",
            }
        )

    if upcoming_in_24h == 0:
        alerts.append(
            {
                "id": "low_upcoming",
                "level": "info",
                "title": "No upcoming bookings today",
                "message": "There are no confirmed bookings scheduled for today.",
                "link": "/bookings?scope=today",
            }
        )

    return Response(
        {
            "generated_at": timezone.now().isoformat(),
            "count": len(alerts),
            "alerts": alerts,
        }
    )