"""
Advanced / ambiguous training samples (Phase 3).

These teach the classifier the difference between a PRIMARY DOMAIN and a
SECONDARY CAPABILITY. Each example deliberately contains a cross-cutting
capability (payments, booking, social, reviews, tracking, subscriptions...) but
is labeled by its MAIN PURPOSE — so the model learns that "pay", "book" or
"share" appearing in a sentence must not, by itself, flip the domain.

Balanced: equal count per class. Kept separate from the core dataset for
clarity, and merged in `dataset.load_dataset()`.
"""
from __future__ import annotations
from typing import List, Tuple

# 10 per class, each carrying at least one "distractor" capability.
ADV_SAMPLES: List[Tuple[str, str]] = [
    # ===== food-delivery (primary) with payment/booking/social distractors =====
    ("book a table at a restaurant and pre order food, then pay the bill", "food-delivery"),
    ("order groceries and split the bill with your roommates", "food-delivery"),
    ("app to order meals, pay online and share your favourite dishes with friends", "food-delivery"),
    ("subscribe to a weekly meal plan and get food delivered, pay monthly", "food-delivery"),
    ("order food, track the delivery rider and rate the restaurant afterwards", "food-delivery"),
    ("reserve a dinner slot, order dishes and pay with your wallet", "food-delivery"),
    ("group food ordering where friends add dishes and split payment", "food-delivery"),
    ("order street food, tip the rider and review the vendor", "food-delivery"),
    ("schedule a food delivery for later and pay on delivery", "food-delivery"),
    ("order coffee ahead, pay in app and collect loyalty points", "food-delivery"),

    # ===== fitness (primary) with booking/payment/social distractors =====
    ("book fitness classes and pay for them", "fitness"),
    ("book a session with a personal trainer and pay per class", "fitness"),
    ("join workout challenges with friends and share your progress", "fitness"),
    ("subscribe to a workout plan, track sessions and pay monthly", "fitness"),
    ("book a yoga class, get a reminder and track your attendance", "fitness"),
    ("track workouts, follow friends and share achievements on a feed", "fitness"),
    ("reserve a spot in a spin class and pay with a membership", "fitness"),
    ("log runs, compare with friends and book group training sessions", "fitness"),
    ("schedule gym sessions, get reminders and track your calories", "fitness"),
    ("book a coach, pay for the plan and monitor weekly progress", "fitness"),

    # ===== banking (primary) — real finance, not just a stray payment =====
    ("manage multiple bank accounts, transfer money and track spending", "banking"),
    ("send money to contacts, pay bills and view monthly statements", "banking"),
    ("split expenses with friends and settle up from your bank balance", "banking"),
    ("track your budget, categorize transactions and transfer funds", "banking"),
    ("open a savings account, set goals and schedule automatic transfers", "banking"),
    ("pay bills, recharge your phone and manage cards in one wallet", "banking"),
    ("send money abroad, track the transfer and view exchange rates", "banking"),
    ("manage your salary account, pay rent and split bills with flatmates", "banking"),
    ("view balances across accounts, freeze cards and analyse spending", "banking"),
    ("apply for a loan, track repayments and manage your account", "banking"),

    # ===== ecommerce (primary) — marketplaces incl. courses/services =====
    ("a marketplace for online courses you can buy and review", "ecommerce"),
    ("a marketplace where sellers list products and buyers purchase and rate them", "ecommerce"),
    ("buy digital templates from creators, review them and track orders", "ecommerce"),
    ("shop handmade goods, add to cart, checkout and leave reviews", "ecommerce"),
    ("a marketplace to buy and sell used furniture with reviews", "ecommerce"),
    ("subscribe to a product box, manage orders and rate items", "ecommerce"),
    ("buy event tickets, pay online and get them delivered to your wallet", "ecommerce"),
    ("marketplace for booking services like cleaning that you pay for online", "ecommerce"),
    ("browse a catalog, add items to cart, apply coupons and pay", "ecommerce"),
    ("buy and review online courses in a course marketplace", "ecommerce"),

    # ===== education (primary) with purchase/social/tracking distractors =====
    ("enroll in courses, watch lessons and track your learning progress", "education"),
    ("buy a course, take quizzes and earn a certificate", "education"),
    ("learn languages with lessons, share progress and follow other learners", "education"),
    ("subscribe to a learning plan, complete lessons and track streaks", "education"),
    ("book a tutoring session, attend the class and rate the tutor", "education"),
    ("take online courses, submit assignments and discuss with classmates", "education"),
    ("study with flashcards, track mastery and compete with friends", "education"),
    ("watch coding lessons, practice exercises and track your progress", "education"),
    ("enroll in a bootcamp, pay in installments and track completion", "education"),
    ("learn to cook with video lessons and track which recipes you finished", "education"),

    # ===== social (primary) with sharing/messaging/booking distractors =====
    ("share photos, follow friends and comment on their posts", "social"),
    ("post short videos, chat with followers and go live", "social"),
    ("plan a trip with friends and share photos along the way", "social"),
    ("a community to post questions, follow topics and message members", "social"),
    ("share workout photos, follow athletes and react to their posts", "social"),
    ("create a profile, share stories and message your friends", "social"),
    ("a social feed where users post, like, comment and follow creators", "social"),
    ("share recipes, follow home cooks and comment on dishes", "social"),
    ("post travel moments, follow explorers and chat about destinations", "social"),
    ("share book reviews, follow readers and discuss in comments", "social"),

    # ===== travel (primary) with payment/social/booking distractors =====
    ("plan trips, book hotels and pay for your stay", "travel"),
    ("search flights, book tickets and share your itinerary with friends", "travel"),
    ("book a homestay, message the host and pay online", "travel"),
    ("plan a group trip, split travel costs and share photos", "travel"),
    ("discover destinations, book tours and review the experience", "travel"),
    ("book flights and hotels, track your trip and get reminders", "travel"),
    ("reserve a vacation rental, pay a deposit and message the owner", "travel"),
    ("plan an itinerary, book activities and rate the places you visit", "travel"),
    ("book bus tickets, pick seats and pay from your wallet", "travel"),
    ("find weekend getaways, book stays and follow travel creators", "travel"),

    # ===== productivity (primary) with reminders/social/subscription distractors =====
    ("manage tasks, set reminders and track your daily habits", "productivity"),
    ("book meeting slots, get reminders and manage your calendar", "productivity"),
    ("organize projects, assign tasks to teammates and message them", "productivity"),
    ("track habits, share streaks with friends and set reminders", "productivity"),
    ("take notes, subscribe to a pro plan and sync across devices", "productivity"),
    ("plan your week, get notifications and review completed tasks", "productivity"),
    ("schedule appointments, get reminders and manage your to do list", "productivity"),
    ("manage a reading list, track progress and set reminders", "productivity"),
    ("create tasks, set due dates and get notified before deadlines", "productivity"),
    ("track goals, break them into tasks and review weekly progress", "productivity"),
]


def advanced_samples() -> List[Tuple[str, str]]:
    return list(ADV_SAMPLES)
