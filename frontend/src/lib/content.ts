/**
 * Sample content library.
 *
 * Realistic placeholder data per app type so generated screens look convincing
 * (a food app shows dishes, a fitness app shows workouts, etc.) instead of
 * "Item 1 / Item 2". Purely presentational; keyed by the classifier's labels.
 */
import type { ComponentProps } from "@/types/schema";
import { uid } from "./ids";

type Item = NonNullable<ComponentProps["items"]>[number];

const tones = ["morph", "cyan", "sky", "amber", "rose", "emerald", "violet", "slate"];
function tone(i: number) {
  return tones[i % tones.length];
}

function items(rows: Array<Partial<Item> & { title: string }>): Item[] {
  return rows.map((r, i) => ({
    id: uid("it"),
    subtitle: r.subtitle,
    trailing: r.trailing,
    icon: r.icon,
    price: r.price,
    rating: r.rating,
    image: r.image ?? tone(i),
    title: r.title,
  }));
}

export interface AppContent {
  categories: string[];
  primaryList: Item[]; // main feed / catalog
  detailTitle: string;
  detailSubtitle: string;
  /** real, domain-specific descriptive copy for the detail screen (never a
   *  "this is placeholder text" filler — reads like the actual product). */
  detailBody: string;
  /** short factual attribute chips shown on the detail screen (e.g. prep time,
   *  duration, materials) — gives the detail screen domain-appropriate texture. */
  detailHighlights: string[];
  detailPrice?: string;
  /** short customer reviews shown on the detail screen when a reviews/rating
   *  capability was detected — real, domain-appropriate copy (not lorem). */
  reviews?: Array<{ id: string; author: string; text: string; rating: number }>;
  /** order/delivery-tracking copy, used only by delivery domains that generate
   *  a dedicated tracking screen (food-delivery / ecommerce). */
  trackingEta?: string;
  trackingNote?: string;
  navTabs: string[];
  heroTitle: string;
  heroSubtitle: string;
}

const LIBRARY: Record<string, AppContent> = {
  "food-delivery": {
    categories: ["All", "Pizza", "Burgers", "Sushi", "Desserts", "Healthy"],
    primaryList: items([
      { title: "Bella Napoli", subtitle: "Italian • 20-30 min", rating: 4.8, trailing: "$$" },
      { title: "Sakura Sushi", subtitle: "Japanese • 25-35 min", rating: 4.7, trailing: "$$$" },
      { title: "The Burger Yard", subtitle: "American • 15-25 min", rating: 4.5, trailing: "$$" },
      { title: "Green Bowl", subtitle: "Healthy • 20-30 min", rating: 4.6, trailing: "$" },
    ]),
    detailTitle: "Bella Napoli",
    detailSubtitle: "Wood-fired pizza & pasta",
    detailBody:
      "Family-run trattoria serving Naples-style pizza from a wood-fired oven, " +
      "fresh pasta made daily, and a short list of Italian classics. Popular for " +
      "dinner — order ahead to skip the wait.",
    detailHighlights: ["20-30 min", "Free delivery over $25", "4.8 ★ (2.1k)"],
    detailPrice: "$14.90",
    reviews: [
      { id: "r1", author: "Marco R.", text: "Best margherita in the city — the crust is perfect every time.", rating: 5 },
      { id: "r2", author: "Lena K.", text: "Arrived hot and fast. The pasta specials are always worth it.", rating: 4 },
    ],
    trackingEta: "Arriving in 18 min",
    trackingNote: "Your order is being prepared at Bella Napoli.",
    navTabs: ["Home", "Search", "Orders", "Profile"],
    heroTitle: "Hungry?",
    heroSubtitle: "Order from the best places near you",
  },
  ecommerce: {
    categories: ["All", "New", "Men", "Women", "Shoes", "Sale"],
    primaryList: items([
      { title: "Wool Runner", subtitle: "Footwear", price: "$98", rating: 4.6 },
      { title: "Merino Tee", subtitle: "Tops", price: "$45", rating: 4.4 },
      { title: "Canvas Tote", subtitle: "Bags", price: "$60", rating: 4.8 },
      { title: "Linen Shirt", subtitle: "Tops", price: "$72", rating: 4.5 },
    ]),
    detailTitle: "Wool Runner",
    detailSubtitle: "Everyday comfort, naturally.",
    detailBody:
      "Made from responsibly-sourced merino wool that regulates temperature and " +
      "resists odour, so you can wear them all day. Machine washable, with a " +
      "cushioned sole moulded for everyday walking.",
    detailHighlights: ["Merino wool", "Free returns", "In stock"],
    detailPrice: "$98.00",
    reviews: [
      { id: "r1", author: "Priya S.", text: "So comfortable I bought a second pair. True to size.", rating: 5 },
      { id: "r2", author: "Daniel W.", text: "Great everyday shoe. Wish it came in more colours.", rating: 4 },
    ],
    trackingEta: "Out for delivery",
    trackingNote: "Your package will arrive today by 8 PM.",
    navTabs: ["Shop", "Search", "Bag", "Account"],
    heroTitle: "New season",
    heroSubtitle: "Curated pieces, made to last",
  },
  fitness: {
    categories: ["Today", "Strength", "Cardio", "Mobility", "Recovery"],
    primaryList: items([
      { title: "Full Body Burn", subtitle: "32 min • Intermediate", trailing: "320 kcal" },
      { title: "Morning Run", subtitle: "5.2 km • Outdoor", trailing: "410 kcal" },
      { title: "Core & Abs", subtitle: "18 min • Beginner", trailing: "150 kcal" },
      { title: "Mobility Flow", subtitle: "24 min • All levels", trailing: "120 kcal" },
    ]),
    detailTitle: "Full Body Burn",
    detailSubtitle: "12 exercises • 32 minutes",
    detailBody:
      "A high-intensity circuit hitting every major muscle group. No equipment " +
      "needed — just body weight and a mat. Follow the guided timer through warm-up, " +
      "three work rounds, and a cooldown stretch.",
    detailHighlights: ["32 min", "Intermediate", "~320 kcal"],
    reviews: [
      { id: "r1", author: "Chris T.", text: "Brutal but effective — I feel it the next day every time.", rating: 5 },
      { id: "r2", author: "Amina B.", text: "Love that it needs no equipment. Great for busy mornings.", rating: 5 },
    ],
    navTabs: ["Home", "Workouts", "Progress", "Profile"],
    heroTitle: "Good morning, Alex",
    heroSubtitle: "You're on a 6-day streak",
  },
  banking: {
    categories: ["Overview", "Cards", "Payments", "Insights"],
    primaryList: items([
      { title: "Spotify", subtitle: "Today • Subscription", trailing: "-$9.99" },
      { title: "Salary", subtitle: "Yesterday • Income", trailing: "+$3,200" },
      { title: "Whole Foods", subtitle: "2 days ago • Groceries", trailing: "-$62.40" },
      { title: "Transfer to Sam", subtitle: "3 days ago • Sent", trailing: "-$120.00" },
    ]),
    detailTitle: "Send money",
    detailSubtitle: "Choose a recipient and amount",
    detailBody:
      "Transfer to any saved recipient instantly, with no fees on standard " +
      "transfers. Amounts are verified against your available balance and " +
      "protected with two-factor confirmation before they send.",
    detailHighlights: ["Instant", "No fee", "2FA protected"],
    navTabs: ["Home", "Cards", "Send", "Profile"],
    heroTitle: "Total balance",
    heroSubtitle: "$12,480.55",
  },
  education: {
    categories: ["All", "Design", "Code", "Business", "Data"],
    primaryList: items([
      { title: "UI Design Foundations", subtitle: "12 lessons • 3.5 h", rating: 4.9 },
      { title: "Intro to Python", subtitle: "18 lessons • 5 h", rating: 4.7 },
      { title: "Product Analytics", subtitle: "9 lessons • 2 h", rating: 4.6 },
      { title: "Public Speaking", subtitle: "7 lessons • 1.5 h", rating: 4.8 },
    ]),
    detailTitle: "UI Design Foundations",
    detailSubtitle: "Master the basics of interface design",
    detailBody:
      "A hands-on introduction to layout, colour, type and spacing. Each lesson " +
      "pairs a short video with a practical exercise, and you finish by shipping a " +
      "small app screen you can add to your portfolio.",
    detailHighlights: ["12 lessons", "3.5 hours", "Certificate"],
    reviews: [
      { id: "r1", author: "Sofia M.", text: "Clear, practical lessons. My portfolio piece came out great.", rating: 5 },
      { id: "r2", author: "Ravi P.", text: "Perfect pace for a beginner. The exercises really stick.", rating: 4 },
    ],
    navTabs: ["Learn", "Search", "Progress", "Profile"],
    heroTitle: "Keep learning",
    heroSubtitle: "You're 60% through this week's goal",
  },
  social: {
    categories: ["For you", "Following", "Trending"],
    primaryList: items([
      { title: "maya.designs", subtitle: "Just shipped a new case study ✨", trailing: "2h" },
      { title: "devjourney", subtitle: "Day 42 of building in public", trailing: "4h" },
      { title: "the.studio", subtitle: "Behind the scenes of our shoot", trailing: "6h" },
      { title: "wanderlens", subtitle: "Sunrise over the valley", trailing: "8h" },
    ]),
    detailTitle: "maya.designs",
    detailSubtitle: "Product designer • 12.4k followers",
    detailBody:
      "Just shipped a new case study on redesigning a checkout flow — swipe through " +
      "the before/after and the metrics that moved. Drop a comment if you want the " +
      "full breakdown of the research behind it.",
    detailHighlights: ["2h ago", "312 likes", "28 comments"],
    navTabs: ["Feed", "Search", "Create", "Profile"],
    heroTitle: "Your feed",
    heroSubtitle: "Fresh from people you follow",
  },
  travel: {
    categories: ["Flights", "Hotels", "Trips", "Explore"],
    primaryList: items([
      { title: "Kyoto, Japan", subtitle: "5 nights • Boutique stay", price: "$740", rating: 4.9 },
      { title: "Lisbon, Portugal", subtitle: "4 nights • Sea view", price: "$520", rating: 4.7 },
      { title: "Reykjavík, Iceland", subtitle: "3 nights • Cabin", price: "$610", rating: 4.8 },
      { title: "Bali, Indonesia", subtitle: "7 nights • Villa", price: "$890", rating: 4.6 },
    ]),
    detailTitle: "Kyoto, Japan",
    detailSubtitle: "Machiya townhouse • Gion district",
    detailBody:
      "A restored wooden townhouse steps from Gion's lantern-lit lanes, with a " +
      "private garden and tatami rooms. Walk to the temples by morning and the " +
      "riverside restaurants by night. Five nights, breakfast included.",
    detailHighlights: ["5 nights", "Free cancellation", "4.9 ★ (186)"],
    detailPrice: "$740 total",
    reviews: [
      { id: "r1", author: "Hannah L.", text: "The garden and location were magical. Would stay again.", rating: 5 },
      { id: "r2", author: "Tomás G.", text: "Authentic and quiet, steps from everything. Host was lovely.", rating: 5 },
    ],
    navTabs: ["Explore", "Search", "Trips", "Profile"],
    heroTitle: "Where to next?",
    heroSubtitle: "Find your next escape",
  },
  healthcare: {
    categories: ["All", "General", "Dental", "Skin", "Mental", "Pediatric"],
    primaryList: items([
      { title: "Dr. Sarah Chen", subtitle: "Cardiologist • 12 yrs exp", rating: 4.9, trailing: "Today" },
      { title: "Dr. Omar Haddad", subtitle: "Dermatologist • 8 yrs exp", rating: 4.8, trailing: "Tomorrow" },
      { title: "Dr. Priya Nair", subtitle: "General Physician • 15 yrs exp", rating: 4.9, trailing: "Mon" },
      { title: "Dr. James Okafor", subtitle: "Dentist • 10 yrs exp", rating: 4.7, trailing: "Tue" },
    ]),
    detailTitle: "Dr. Sarah Chen",
    detailSubtitle: "Cardiologist • City Heart Clinic",
    detailBody:
      "Board-certified cardiologist with 12 years of experience in preventive heart " +
      "care and diagnostics. Consultations run 30 minutes and can be in-person or " +
      "video. Bring any recent test results to your first visit.",
    detailHighlights: ["12 yrs exp", "Available today", "Video or in-person"],
    detailPrice: "$60 / visit",
    reviews: [
      { id: "r1", author: "Grace O.", text: "Dr. Chen is thorough and never rushes. Truly reassuring.", rating: 5 },
      { id: "r2", author: "Ahmed F.", text: "Booking was easy and the video visit was seamless.", rating: 5 },
    ],
    navTabs: ["Home", "Search", "Appointments", "Profile"],
    heroTitle: "Feel better, faster",
    heroSubtitle: "Book a doctor in minutes",
  },
  media: {
    categories: ["For You", "Trending", "Movies", "Shows", "Music", "Podcasts"],
    primaryList: items([
      { title: "The Silent Coast", subtitle: "Thriller • 1h 52m", trailing: "★ 8.4" },
      { title: "Neon Nights", subtitle: "Series • S2 · 8 eps", trailing: "★ 8.9" },
      { title: "Deep Focus", subtitle: "Playlist • 42 tracks", trailing: "2h 10m" },
      { title: "Builders Talk", subtitle: "Podcast • Ep. 118", trailing: "54 min" },
    ]),
    detailTitle: "The Silent Coast",
    detailSubtitle: "Thriller • 2024 • 1h 52m",
    detailBody:
      "A detective returns to her fog-bound hometown to investigate a disappearance " +
      "that mirrors a case she never closed. Taut, atmospheric, and full of turns — " +
      "critics are calling it the year's sharpest thriller.",
    detailHighlights: ["1h 52m", "★ 8.4", "4K HDR"],
    reviews: [
      { id: "r1", author: "Jordan V.", text: "Atmospheric and gripping — didn't see the ending coming.", rating: 5 },
      { id: "r2", author: "Mei L.", text: "Slow burn but so worth it. Stunning cinematography.", rating: 4 },
    ],
    navTabs: ["Home", "Search", "Library", "Profile"],
    heroTitle: "Tonight's pick",
    heroSubtitle: "Handpicked for you",
  },
  booking: {
    categories: ["All", "Hair", "Spa", "Nails", "Fitness", "Dining"],
    primaryList: items([
      { title: "Luxe Hair Studio", subtitle: "Haircut & style • 45 min", price: "$40", rating: 4.8 },
      { title: "Serenity Day Spa", subtitle: "Deep tissue • 60 min", price: "$85", rating: 4.9 },
      { title: "Polished Nail Bar", subtitle: "Gel manicure • 40 min", price: "$35", rating: 4.7 },
      { title: "Table for Two", subtitle: "Dinner reservation • 2 guests", trailing: "7:30 PM", rating: 4.6 },
    ]),
    detailTitle: "Luxe Hair Studio",
    detailSubtitle: "Haircut & style • Downtown",
    detailBody:
      "A modern salon in the heart of downtown offering precision cuts, colour and " +
      "styling. Pick a stylist and an open slot, and you'll get a reminder the day " +
      "before. Walk-ins welcome when there's availability.",
    detailHighlights: ["45 min", "Next slot 2:30 PM", "4.8 ★ (540)"],
    detailPrice: "$40",
    reviews: [
      { id: "r1", author: "Bella N.", text: "Best cut I've had in years. Booking took ten seconds.", rating: 5 },
      { id: "r2", author: "Omar S.", text: "Friendly stylists and never a long wait. Highly recommend.", rating: 4 },
    ],
    navTabs: ["Discover", "Search", "Bookings", "Profile"],
    heroTitle: "Book your spot",
    heroSubtitle: "Find open times near you",
  },
  productivity: {
    categories: ["Today", "Upcoming", "Projects", "Done"],
    primaryList: items([
      { title: "Finish design review", subtitle: "Due today • Work", icon: "circle" },
      { title: "Call the supplier", subtitle: "Due today • Errands", icon: "circle" },
      { title: "Draft project brief", subtitle: "Tomorrow • Work", icon: "circle" },
      { title: "Plan weekend trip", subtitle: "Fri • Personal", icon: "circle" },
    ]),
    detailTitle: "Finish design review",
    detailSubtitle: "Work • Due today at 5:00 PM",
    detailBody:
      "Review the latest mockups from the design team and leave consolidated " +
      "feedback in the shared doc. Blocks the handoff to engineering, so it's the " +
      "top priority for today. Mark subtasks as you go.",
    detailHighlights: ["Due 5:00 PM", "High priority", "Work"],
    navTabs: ["Today", "Projects", "Add", "Profile"],
    heroTitle: "Today",
    heroSubtitle: "4 tasks • 1 overdue",
  },
};

export function contentFor(appType: string): AppContent {
  return LIBRARY[appType] ?? LIBRARY["productivity"];
}
