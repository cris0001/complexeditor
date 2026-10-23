import {
  ArrowRight,
  Bookmark,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Clock,
  Copy,
  Download,
  ExternalLink,
  File,
  FileArchive,
  FileAudio,
  FileCode,
  FileImage,
  FileText,
  FileVideo,
  Flag,
  Heart,
  Info,
  Lightbulb,
  Link,
  Mail,
  MapPin,
  Minus,
  Pause,
  Phone,
  Play,
  Plus,
  Quote,
  Rocket,
  Sparkles,
  Square,
  Star,
  TriangleAlert,
  Trophy,
  X,
  Zap,
  ZoomIn,
  ZoomOut,
  type LucideIcon,
} from 'lucide-react';

/** Icons available to blocks (callout, list, buttons, file…). Editors pick them by name. */
export const ICONS = {
  info: Info,
  warning: TriangleAlert,
  success: CircleCheck,
  tip: Lightbulb,
  star: Star,
  heart: Heart,
  flag: Flag,
  bookmark: Bookmark,
  zap: Zap,
  sparkles: Sparkles,
  rocket: Rocket,
  trophy: Trophy,
  quote: Quote,
  check: Check,
  square: Square,
  'arrow-right': ArrowRight,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  close: X,
  plus: Plus,
  minus: Minus,
  copy: Copy,
  download: Download,
  file: File,
  'file-text': FileText,
  'file-image': FileImage,
  'file-video': FileVideo,
  'file-audio': FileAudio,
  'file-archive': FileArchive,
  'file-code': FileCode,
  'external-link': ExternalLink,
  play: Play,
  pause: Pause,
  'zoom-in': ZoomIn,
  'zoom-out': ZoomOut,
  'map-pin': MapPin,
  calendar: Calendar,
  clock: Clock,
  mail: Mail,
  phone: Phone,
  link: Link,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;
export const ICON_NAMES = Object.keys(ICONS) as IconName[];

export const isIconName = (name: unknown): name is IconName => typeof name === 'string' && name in ICONS;

/** Decorative icon (`aria-hidden`). Unknown names render nothing. */
export function Icon({
  name,
  className,
  size = 20,
}: {
  name: string | undefined;
  className?: string;
  size?: number;
}) {
  if (!isIconName(name)) return null;
  const Component = ICONS[name];
  return (
    <Component className={className} size={size} aria-hidden="true" focusable="false" strokeWidth={1.75} />
  );
}
