/**
 * Curated lucide icon map for rendered prototypes.
 * Only the icons the generator references are imported (keeps the bundle lean).
 */
import {
  Search, Bell, User, Mail, Lock, Plus, ArrowRight, ArrowLeft, Settings,
  CreditCard, HelpCircle, Send, Home, Heart, ShoppingBag, ShoppingCart,
  Circle, CheckCircle2, Star, DollarSign, Play, Compass, BarChart3,
  Calendar, MessageCircle, MoreHorizontal, ChevronRight, Inbox, Stethoscope,
  Library, Clapperboard, MapPin, Clock, type LucideIcon,
} from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  search: Search, bell: Bell, user: User, mail: Mail, lock: Lock, plus: Plus,
  "arrow-right": ArrowRight, "arrow-left": ArrowLeft, settings: Settings,
  "credit-card": CreditCard, "help-circle": HelpCircle, send: Send, home: Home,
  heart: Heart, "shopping-bag": ShoppingBag, "shopping-cart": ShoppingCart,
  circle: Circle, check: CheckCircle2, star: Star, "dollar-sign": DollarSign,
  play: Play, compass: Compass, chart: BarChart3, calendar: Calendar,
  message: MessageCircle, more: MoreHorizontal, chevron: ChevronRight,
  inbox: Inbox, stethoscope: Stethoscope, library: Library,
  clapperboard: Clapperboard, "map-pin": MapPin, clock: Clock,
};

export function Icon({
  name,
  size = 18,
  color,
  className,
}: {
  name?: string;
  size?: number;
  color?: string;
  className?: string;
}) {
  const Cmp = (name && MAP[name]) || Circle;
  return <Cmp size={size} color={color} className={className} strokeWidth={2} />;
}

/** Map a bottom-nav tab label to a sensible icon name. */
export function tabIcon(label: string): string {
  const l = label.toLowerCase();
  if (l.includes("home") || l.includes("feed") || l.includes("explore") || l.includes("shop") || l.includes("learn") || l.includes("today") || l.includes("discover")) return "home";
  if (l.includes("search")) return "search";
  if (l.includes("cart") || l.includes("bag") || l.includes("order")) return "shopping-bag";
  if (l.includes("profile") || l.includes("account")) return "user";
  if (l.includes("progress") || l.includes("stat")) return "chart";
  if (l.includes("send")) return "send";
  if (l.includes("card")) return "credit-card";
  if (l.includes("create") || l.includes("add")) return "plus";
  if (l.includes("trip") || l.includes("project")) return "compass";
  if (l.includes("workout")) return "play";
  if (l.includes("appointment") || l.includes("booking")) return "calendar";
  if (l.includes("library")) return "library";
  return "circle";
}
