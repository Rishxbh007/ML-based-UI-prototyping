"""
Labeled dataset for the app-type (domain) classifier.

Hand-authored, balanced corpus of natural-language app descriptions, kept in
source so it is fully inspectable and defensible in the viva.

Design goals for this expanded version:
  * ~32 samples per class (8 classes -> ~256 total), up from 12/class.
  * Deliberate VARIETY per class: short fragments, medium sentences, long /
    multi-feature descriptions, and differently-phrased (imperative, feature
    list, user-story) requirements — so the model learns signal, not templates.
  * Balanced across classes (equal counts) to avoid a biased classifier.

Genuinely ambiguous / cross-domain requirements are intentionally kept OUT of
training and live in `ml/evaluation/eval_set.py` as unseen test cases.
"""
from __future__ import annotations
from typing import List, Tuple

APP_TYPES: List[str] = [
    "food-delivery",
    "fitness",
    "banking",
    "ecommerce",
    "education",
    "social",
    "travel",
    "productivity",
]

# (text, label) pairs.
SAMPLES: List[Tuple[str, str]] = [
    # ============================ food-delivery ============================
    ("a food delivery app where users browse restaurants and order meals", "food-delivery"),
    ("app to order food online from nearby restaurants with cart and checkout", "food-delivery"),
    ("let users search for dishes, add to cart and track their delivery", "food-delivery"),
    ("restaurant discovery and meal ordering platform with live order tracking", "food-delivery"),
    ("order groceries and food, schedule delivery and pay online", "food-delivery"),
    ("food ordering app with menus, ratings, cart and payment", "food-delivery"),
    ("browse cuisines, pick a restaurant, customize your meal and checkout", "food-delivery"),
    ("takeaway app to find restaurants, order food and rate the delivery", "food-delivery"),
    ("app for ordering pizza and fast food with saved addresses", "food-delivery"),
    ("meal delivery service where customers add items to a basket and pay", "food-delivery"),
    ("discover local eateries, read reviews and get food delivered", "food-delivery"),
    ("cloud kitchen ordering app with cart, offers and order history", "food-delivery"),
    ("order food", "food-delivery"),
    ("food delivery", "food-delivery"),
    ("restaurant ordering app", "food-delivery"),
    ("an app that lets hungry users find nearby restaurants, browse their menus, filter by cuisine and price, add several dishes to a cart, apply a coupon, choose an address, pay with a card and follow the courier on a live map until the food arrives", "food-delivery"),
    ("i want customers to reorder their favourite meals in one tap and schedule deliveries for later", "food-delivery"),
    ("a tiffin and home food subscription app with weekly menus and delivery slots", "food-delivery"),
    ("app where restaurants list dishes and customers place orders for delivery or pickup", "food-delivery"),
    ("food court app to order from multiple stalls in one basket", "food-delivery"),
    ("late night snack delivery with real time rider tracking and tipping", "food-delivery"),
    ("build a food app with restaurant listings, dish search, cart, checkout and order status", "food-delivery"),
    ("customers browse menu, add food to cart, choose delivery time and pay", "food-delivery"),
    ("an app to order coffee ahead and skip the queue at cafes", "food-delivery"),
    ("grocery and meal delivery with slots, cart and contactless payment", "food-delivery"),
    ("order meals from restaurants and track the delivery driver", "food-delivery"),
    ("a food app with favourites, reorders, offers and live tracking", "food-delivery"),
    ("hyperlocal food delivery connecting home chefs with nearby customers", "food-delivery"),
    ("order lunch for the office with group carts and split billing", "food-delivery"),
    ("app to browse street food vendors and order for delivery", "food-delivery"),
    ("meal kit ordering app with recipes, cart and scheduled delivery", "food-delivery"),
    ("food delivery app with restaurant search, ratings, cart, checkout, order tracking and reordering", "food-delivery"),

    # ================================ fitness ==============================
    ("a fitness tracking app for college students to log workouts", "fitness"),
    ("track your runs, calories and daily activity with progress charts", "fitness"),
    ("workout planner with exercise routines and progress tracking", "fitness"),
    ("gym app to follow training plans and monitor weight and reps", "fitness"),
    ("health and fitness app that logs steps, sleep and heart rate", "fitness"),
    ("app to schedule workouts, track goals and see weekly progress", "fitness"),
    ("personal trainer app with guided exercises and activity dashboard", "fitness"),
    ("yoga and meditation app with sessions and streak tracking", "fitness"),
    ("running tracker that records distance, pace and calories burned", "fitness"),
    ("fitness coach app with workout library and body stats", "fitness"),
    ("diet and exercise tracker with daily goals and charts", "fitness"),
    ("app to build muscle with training programs and progress logs", "fitness"),
    ("workout tracker", "fitness"),
    ("fitness app", "fitness"),
    ("track my workouts", "fitness"),
    ("a comprehensive fitness companion that builds personalized workout plans, tracks every set and rep, logs calories and macros, syncs steps and heart rate from a wearable, shows weekly and monthly progress charts and lets users set and celebrate goals", "fitness"),
    ("i want people to join workout challenges with friends and keep a daily streak", "fitness"),
    ("home workout app with video exercises, timers and progress history", "fitness"),
    ("app that recommends workouts based on your goals and tracks recovery", "fitness"),
    ("step counter and activity tracker with daily goals and badges", "fitness"),
    ("strength training log to record exercises, weights and personal records", "fitness"),
    ("build a fitness app with plans, workout logging, progress charts and profile", "fitness"),
    ("cycling and running app that maps routes and tracks performance", "fitness"),
    ("app for tracking water intake, sleep and daily movement", "fitness"),
    ("guided meditation and breathing app with sessions and streaks", "fitness"),
    ("weight loss app with calorie tracking, meal logging and progress", "fitness"),
    ("crossfit workout tracker with WODs, timers and leaderboards", "fitness"),
    ("a fitness app to follow plans, log sessions and monitor goals", "fitness"),
    ("pregnancy fitness app with safe workouts and weekly progress", "fitness"),
    ("app to track gym sessions, set goals and view body measurements", "fitness"),
    ("physio and rehab exercise app with routines and progress tracking", "fitness"),
    ("fitness app with workout plans, activity tracking, goals, progress charts and profile", "fitness"),

    # ================================ banking ==============================
    ("a mobile banking app to check balance and transfer money", "banking"),
    ("app to send money, pay bills and view transaction history", "banking"),
    ("digital wallet for payments, transfers and account statements", "banking"),
    ("banking app with accounts, cards, transfers and spending insights", "banking"),
    ("manage your savings, send funds and track expenses securely", "banking"),
    ("finance app to view balances, move money between accounts and pay", "banking"),
    ("upi payments app to transfer money and scan to pay", "banking"),
    ("personal finance app with budgets, transactions and transfers", "banking"),
    ("app for online banking, bill payment and fund transfer", "banking"),
    ("wallet app to top up, pay merchants and see statements", "banking"),
    ("investment and banking app to manage portfolio and transfer cash", "banking"),
    ("secure banking app with login, dashboard and money transfer", "banking"),
    ("banking app", "banking"),
    ("send money", "banking"),
    ("mobile wallet", "banking"),
    ("a secure digital banking app where users open accounts, check balances across savings and current accounts, transfer money to contacts, pay utility bills, freeze cards, set spending limits and get categorized insights into their monthly spending", "banking"),
    ("i want users to split bills with friends and settle up instantly", "banking"),
    ("neobank app with virtual cards, instant transfers and savings goals", "banking"),
    ("expense manager that connects accounts and categorizes transactions", "banking"),
    ("app to pay bills, recharge mobile and transfer to any bank", "banking"),
    ("cryptocurrency wallet to send, receive and track coin balances", "banking"),
    ("build a banking app with accounts, transfers, bill pay and insights", "banking"),
    ("loan and credit app to apply, track repayments and view statements", "banking"),
    ("app for scanning QR codes to pay shops and split payments", "banking"),
    ("savings app with goals, auto deposits and balance tracking", "banking"),
    ("business banking app to manage payroll, invoices and transfers", "banking"),
    ("app to track spending, set budgets and transfer between accounts", "banking"),
    ("a finance app for transfers, payments, statements and card control", "banking"),
    ("remittance app to send money abroad with low fees and tracking", "banking"),
    ("app to manage multiple cards, view transactions and pay bills", "banking"),
    ("student banking app with allowance tracking and instant transfers", "banking"),
    ("banking app with balance, transfers, bill payment, cards and spending insights", "banking"),

    # ================================ ecommerce ============================
    ("an online shopping app to browse products and buy them", "ecommerce"),
    ("ecommerce store with product catalog, cart and checkout", "ecommerce"),
    ("app to shop clothes, add to wishlist and place orders", "ecommerce"),
    ("marketplace to browse items, compare prices and purchase", "ecommerce"),
    ("shopping app with categories, product details, cart and payment", "ecommerce"),
    ("buy electronics online with reviews, cart and order tracking", "ecommerce"),
    ("fashion store app with search, filters, wishlist and checkout", "ecommerce"),
    ("app to sell and buy products with listings and secure payment", "ecommerce"),
    ("retail app to browse deals, add to bag and checkout fast", "ecommerce"),
    ("online store for handmade goods with cart and order history", "ecommerce"),
    ("buy furniture online with product details, cart and delivery", "ecommerce"),
    ("app to browse gadgets, view details and buy with a cart", "ecommerce"),
    ("shopping app", "ecommerce"),
    ("online store", "ecommerce"),
    ("buy products online", "ecommerce"),
    ("a full featured shopping app where users browse categories, search products with filters, read reviews and ratings, add items to a wishlist and cart, apply discount codes, choose shipping and pay, then track their orders and manage returns", "ecommerce"),
    ("i want sellers to list products and buyers to purchase with reviews", "ecommerce"),
    ("second hand marketplace to list, browse and buy used items", "ecommerce"),
    ("beauty and cosmetics store with catalog, wishlist and checkout", "ecommerce"),
    ("app to shop sneakers with size filters, cart and fast checkout", "ecommerce"),
    ("subscription box shopping app with catalog and recurring orders", "ecommerce"),
    ("build an ecommerce app with catalog, search, cart, checkout and orders", "ecommerce"),
    ("grocery shopping app with product listings, cart and home delivery", "ecommerce"),
    ("app to browse books, add to cart and buy with reviews", "ecommerce"),
    ("electronics marketplace with comparisons, wishlist and secure payment", "ecommerce"),
    ("app to shop pet supplies with categories, cart and reorders", "ecommerce"),
    ("jewelry store app with product galleries, wishlist and checkout", "ecommerce"),
    ("an app for shopping with catalog, cart, wishlist and payment", "ecommerce"),
    ("plant shop app to browse, add to bag and order plants", "ecommerce"),
    ("app to buy tickets and merchandise with cart and checkout", "ecommerce"),
    ("home decor shopping app with search, product details and cart", "ecommerce"),
    ("shopping app with product catalog, search, wishlist, cart, checkout and order tracking", "ecommerce"),

    # ================================ education ============================
    ("an e-learning app with courses, lessons and quizzes", "education"),
    ("app for students to enroll in courses and watch video lessons", "education"),
    ("online learning platform with course catalog and progress tracking", "education"),
    ("study app with lessons, quizzes and completion certificates", "education"),
    ("app to take courses, complete assignments and track learning", "education"),
    ("tutoring app with subjects, lessons and practice tests", "education"),
    ("learning app for languages with lessons, streaks and progress", "education"),
    ("app to browse courses, watch lectures and take exams", "education"),
    ("skill learning platform with modules, videos and quizzes", "education"),
    ("education app with classes, study material and progress reports", "education"),
    ("mooc style app to enroll, learn and earn certificates", "education"),
    ("exam prep app with topics, mock tests and score tracking", "education"),
    ("learning app", "education"),
    ("online courses", "education"),
    ("study app", "education"),
    ("a complete e-learning platform where learners browse a catalog of courses, enroll, watch video lessons offline, download materials, take graded quizzes and assignments, track their progress and streaks, join discussions and earn certificates on completion", "education"),
    ("i want teachers to create courses and students to enroll and take quizzes", "education"),
    ("kids learning app with interactive lessons, games and progress", "education"),
    ("coding practice app with tutorials, exercises and a progress tracker", "education"),
    ("app to prepare for competitive exams with mock tests and analytics", "education"),
    ("flashcard app to memorize topics with spaced repetition and quizzes", "education"),
    ("build an education app with courses, lessons, quizzes and progress", "education"),
    ("language learning app with daily lessons, streaks and speaking practice", "education"),
    ("university app to view courses, lectures, assignments and grades", "education"),
    ("app for live classes with recordings, notes and quizzes", "education"),
    ("music learning app with lessons, practice tracking and progress", "education"),
    ("app to learn design with video courses, projects and feedback", "education"),
    ("an app to enroll in courses, study lessons and take tests", "education"),
    ("reading and comprehension app for kids with lessons and rewards", "education"),
    ("app to browse tutorials, follow learning paths and track progress", "education"),
    ("driving theory learning app with lessons and practice tests", "education"),
    ("e-learning app with course catalog, video lessons, quizzes, assignments and progress tracking", "education"),

    # ================================= social ==============================
    ("a social media app to post photos and follow friends", "social"),
    ("app to share updates, like posts and chat with people", "social"),
    ("social network to create profiles, post content and comment", "social"),
    ("photo sharing app with feed, likes, comments and profiles", "social"),
    ("messaging and social app to connect and share moments", "social"),
    ("community app to post, follow users and send messages", "social"),
    ("app to share short videos, follow creators and react", "social"),
    ("social feed app with stories, posts and direct messages", "social"),
    ("networking app to meet people, chat and share updates", "social"),
    ("microblogging app to post thoughts, follow and reply", "social"),
    ("app to build a profile, share posts and grow followers", "social"),
    ("group chat and social app with feed and notifications", "social"),
    ("social app", "social"),
    ("share photos", "social"),
    ("chat app", "social"),
    ("a social platform where people create rich profiles, post photos and videos, share stories that disappear, follow and message each other, like and comment on posts, discover trending content and get notified about activity from friends", "social"),
    ("i want users to post short videos and go live to their followers", "social"),
    ("dating app to match with people, chat and share profiles", "social"),
    ("community forum app to post questions, reply and upvote answers", "social"),
    ("app to share travel photos with a feed, likes and comments", "social"),
    ("anonymous confessions app with feed, reactions and comments", "social"),
    ("build a social app with profiles, feed, posts, likes and messaging", "social"),
    ("event based social app to meet nearby people and chat", "social"),
    ("app for creators to post content, gain followers and message fans", "social"),
    ("book club social app to share reviews, follow readers and discuss", "social"),
    ("fitness social app to share workouts, follow friends and comment", "social"),
    ("app to post memes, react, comment and follow pages", "social"),
    ("a social networking app with feed, stories, chat and profiles", "social"),
    ("neighborhood social app to post updates and connect with locals", "social"),
    ("music sharing social app to post tracks, follow artists and comment", "social"),
    ("pet lovers social app to share photos, follow and message", "social"),
    ("social app with profiles, feed, posts, stories, likes, comments and direct messaging", "social"),

    # ================================= travel ==============================
    ("a travel booking app to search flights and hotels", "travel"),
    ("app to book trips, flights and stays with itineraries", "travel"),
    ("travel planner to discover destinations and book hotels", "travel"),
    ("app to search hotels, compare prices and reserve rooms", "travel"),
    ("flight and hotel booking app with trips and payment", "travel"),
    ("holiday booking app to explore places and book packages", "travel"),
    ("app to book cabs, flights and hotels for your journey", "travel"),
    ("trip planning app with destinations, bookings and maps", "travel"),
    ("travel app to find tours, book stays and manage trips", "travel"),
    ("vacation app to browse resorts and make reservations", "travel"),
    ("app to plan itineraries and book transport and lodging", "travel"),
    ("tourism app to discover attractions and book tickets", "travel"),
    ("travel app", "travel"),
    ("book flights", "travel"),
    ("hotel booking", "travel"),
    ("a travel super app where users search and book flights, hotels and cabs, build day by day itineraries, discover attractions and experiences, read reviews, save trips, get booking confirmations and manage their reservations in one place", "travel"),
    ("i want travelers to book stays and plan trips with maps", "travel"),
    ("homestay booking app to browse listings, book and message hosts", "travel"),
    ("app to book bus and train tickets with seat selection", "travel"),
    ("adventure travel app to find tours, book and track bookings", "travel"),
    ("road trip planner with stops, maps and hotel booking", "travel"),
    ("build a travel app with search, booking, itineraries and trips", "travel"),
    ("app to discover local experiences and book activities", "travel"),
    ("flight comparison app to search, compare and book tickets", "travel"),
    ("app to plan group trips, split costs and book stays", "travel"),
    ("cruise booking app to browse packages, book cabins and pay", "travel"),
    ("app to book airport transfers and hotels for business trips", "travel"),
    ("a travel app to search stays, book and manage itineraries", "travel"),
    ("backpacking app to find hostels, book beds and plan routes", "travel"),
    ("app to rent vacation homes with listings, booking and messaging", "travel"),
    ("visa and travel document app with bookings and trip planning", "travel"),
    ("travel app with flight and hotel search, booking, itineraries and trip management", "travel"),

    # ============================== productivity ===========================
    ("a to-do list app to manage tasks and set reminders", "productivity"),
    ("task manager app with projects, checklists and due dates", "productivity"),
    ("note taking app to write, organize and search notes", "productivity"),
    ("productivity app to plan your day with tasks and calendar", "productivity"),
    ("app to track habits, set goals and get reminders", "productivity"),
    ("project management app with boards, tasks and progress", "productivity"),
    ("app to organize notes, todos and schedules in one place", "productivity"),
    ("time management app with tasks, timers and reminders", "productivity"),
    ("planner app to manage projects, deadlines and checklists", "productivity"),
    ("app to jot notes, create tasks and track completion", "productivity"),
    ("focus app with task lists, pomodoro timer and stats", "productivity"),
    ("daily planner app with agenda, reminders and notes", "productivity"),
    ("todo app", "productivity"),
    ("note taking app", "productivity"),
    ("task planner", "productivity"),
    ("a productivity workspace where users capture tasks and notes, organize them into projects and boards, set due dates and reminders, plan their day on a calendar, track habits and focus sessions and review weekly progress toward their goals", "productivity"),
    ("i want teams to manage projects with boards, tasks and deadlines", "productivity"),
    ("habit tracker app with streaks, reminders and progress charts", "productivity"),
    ("kanban board app to organize tasks into columns and track flow", "productivity"),
    ("app to write journals, set goals and plan the week", "productivity"),
    ("meeting notes app with agendas, action items and reminders", "productivity"),
    ("build a productivity app with tasks, notes, reminders and calendar", "productivity"),
    ("expense and time tracking app for freelancers with reports", "productivity"),
    ("app to manage grocery and shopping checklists with reminders", "productivity"),
    ("goal setting app to break goals into tasks and track progress", "productivity"),
    ("reading list app to save articles, tag and organize them", "productivity"),
    ("app to schedule tasks, block focus time and track productivity", "productivity"),
    ("a planner app to manage tasks, notes and daily schedule", "productivity"),
    ("password and notes vault app to store and organize entries", "productivity"),
    ("app to plan projects with milestones, tasks and reminders", "productivity"),
    ("study planner app to organize subjects, tasks and deadlines", "productivity"),
    ("productivity app with tasks, projects, notes, reminders, calendar and habit tracking", "productivity"),
]


def _all_samples() -> List[Tuple[str, str]]:
    """Core samples + the advanced ambiguous/multi-domain samples (Phase 3)."""
    samples = list(SAMPLES)
    try:
        from ml.data.dataset_advanced import advanced_samples
        samples += advanced_samples()
    except Exception:
        # advanced set is optional; core dataset still works on its own
        pass
    return samples


def load_dataset() -> Tuple[List[str], List[str]]:
    """Return (texts, labels)."""
    samples = _all_samples()
    texts = [t for t, _ in samples]
    labels = [l for _, l in samples]
    return texts, labels


def dataset_stats() -> dict:
    from collections import Counter
    _, labels = load_dataset()
    counts = dict(Counter(labels))
    return {"total": len(labels), "classes": len(counts), "per_class": counts}
