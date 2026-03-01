// /src/lib/core.tsx - v17.13.0 (PERFECT AUTO INVERSION)
// 🎯 Core UI Components - Button, Card, Text, Badge, Link
// ✅ Perfect auto inversion (कुनै hardcoded default color छैन)
// ✅ Text component ले parent को color inherit गर्छ
// ✅ Float shade support (128.5, 200.75)
// ✅ All components optimized

import React, { forwardRef, useState, useCallback, useRef, useEffect } from 'react';
import { ub } from '../mycss';

// ==================== UTILITIES ====================

const cls = (...classes: (string | undefined | false | null)[]): string => {
  return classes.filter(Boolean).join(' ');
};

// ==================== TYPES ====================

export type FeedbackState = 'idle' | 'success' | 'error' | 'loading';
export type Variant = 'primary' | 'ghost' | 'outline' | 'glass';
export type Size = 'sm' | 'md' | 'lg';
export type BadgeVariant = 'primary' | 'success' | 'warning' | 'error' | 'neutral';
export type TextVariant = 'default' | 'muted' | 'heading' | 'primary' | 'success' | 'error' | 'warning';
export type TextSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export type TextWeight = 'normal' | 'medium' | 'bold';
export type TextAlign = 'left' | 'center' | 'right';
export type CardVariant = 'default' | 'glass' | 'outline';

// ==================== COLOR HELPERS ====================
// Float shade support (128.5, 200.75, etc.)

export const bgColor = (color: string, shade: number | string, opacity?: number): string => {
  return opacity ? `bg-${color}-${shade}/${opacity}` : `bg-${color}-${shade}`;
};

export const textColor = (color: string, shade: number | string, opacity?: number): string => {
  return opacity ? `text-${color}-${shade}/${opacity}` : `text-${color}-${shade}`;
};

export const borderColor = (color: string, shade: number | string, opacity?: number): string => {
  return opacity ? `border-${color}-${shade}/${opacity}` : `border-${color}-${shade}`;
};

// ==================== VARIANT SCHEMA ====================
// Engine लाई auto-inversion गर्न दिने - कुनै manual textColor छैन

interface VariantConfig {
  base: string;
  hover?: string;
  active?: string;
  disabled?: string;
  feedback?: Partial<Record<FeedbackState, string>>;
}

const variantSchema: Record<Variant, VariantConfig> = {
  primary: {
    // Engine ले blue-200 बाट auto white text दिनेछ
    base: cls(bgColor('blue', 200), 'border-none', 'rounded-2', 'p-2'),
    hover: bgColor('blue', 220),
    active: bgColor('blue', 240),
    disabled: 'opacity-50',
    feedback: {
      success: bgColor('green', 180),
      error: bgColor('red', 180),
    }
  },
  ghost: {
    // Ghost मा transparent bg, त्यसैले text color चाहिन्छ
    base: cls(bgColor('gray', 0), 'border-none', textColor('gray', 200), 'rounded-2', 'p-2'),
    hover: bgColor('gray', 30),
    active: bgColor('gray', 50),
    disabled: 'opacity-40',
    feedback: {
      success: textColor('green', 180),
      error: textColor('red', 180),
    }
  },
  outline: {
    // Outline मा border र text दुवै auto
    base: cls(bgColor('gray', 0), 'border-1.5', borderColor('gray', 150), 'rounded-2', 'p-2'),
    hover: cls(bgColor('gray', 20), borderColor('gray', 180)),
    active: cls(bgColor('gray', 30), borderColor('gray', 200)),
    disabled: 'opacity-50',
    feedback: {
      success: cls(borderColor('green', 180), textColor('green', 180)),
      error: cls(borderColor('red', 180), textColor('red', 180)),
    }
  },
  glass: {
    // Glass मा translucent bg, text auto हुनेछ
    base: cls(bgColor('gray', 60, 20), 'border-0.5', borderColor('gray', 120), 'rounded-3', 'p-2'),
    hover: bgColor('gray', 80, 30),
    active: bgColor('gray', 100, 40),
    disabled: 'opacity-20',
    feedback: {
      success: bgColor('green', 120, 30),
      error: bgColor('red', 120, 30),
    }
  }
};

const sizeStyles = {
  sm: cls('p-1.5', 'rounded-1.5', 'text-sm'),
  md: cls('p-2', 'rounded-2', 'text-base'),
  lg: cls('p-2.5', 'rounded-2.5', 'text-lg'),
};

// ==================== BUTTON ====================

export interface ButtonProps {
  variant?: Variant;
  size?: Size;
  feedback?: FeedbackState;
  disabled?: boolean;
  loading?: boolean;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  children: React.ReactNode;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  size = 'md',
  feedback = 'idle',
  disabled = false,
  loading = false,
  onClick,
  children,
  className = '',
  type = 'button',
  ...props
}, ref) => {
  const [localFeedback, setLocalFeedback] = useState<FeedbackState>('idle');
  const timeoutRef = useRef<number>();

  const config = variantSchema[variant];
  
  // Raw strings combine गर्ने - एक पटक मात्र ub() प्रयोग हुनेछ
  const classList = cls(
    config.base,
    sizeStyles[size],
    !disabled && !loading && config.hover ? `hover:${config.hover}` : '',
    !disabled && !loading && config.active ? `active:${config.active}` : '',
    (disabled || loading) && config.disabled ? config.disabled : '',
    feedback !== 'idle' && config.feedback?.[feedback] ? config.feedback[feedback] : '',
    localFeedback !== 'idle' && config.feedback?.[localFeedback] ? config.feedback[localFeedback] : '',
    className
  );

  const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || loading) return;
    onClick?.(e);
  }, [disabled, loading, onClick]);

  useEffect(() => {
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, []);

  return (
    <button
      ref={ref}
      type={type}
      className={ub(classList)}
      disabled={disabled || loading}
      onClick={handleClick}
      {...props}
    >
      {loading ? (
        <span className={ub('flex items-center gap-2')}>
          <span className={ub('animate-spin')}>⟳</span>
          {children}
        </span>
      ) : children}
    </button>
  );
});

Button.displayName = 'Button';

// ==================== CARD ====================

export interface CardProps {
  variant?: CardVariant;
  padding?: number | string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  padding = 4,
  children,
  className = '',
  onClick,
  ...props
}) => {
  const variantStyles = {
    default: cls(bgColor('gray', 20), 'border-0.5', borderColor('gray', 100), 'rounded-3', 'shadow-2'),
    glass: cls(bgColor('gray', 60, 15), 'border-0.5', borderColor('gray', 120), 'rounded-3'),
    outline: cls(bgColor('gray', 0), 'border-1.5', borderColor('gray', 150), 'rounded-3'),
  };

  return (
    <div
      className={ub(cls(
        variantStyles[variant], 
        `p-${padding}`, 
        'transition-all duration-200', 
        onClick ? 'cursor-pointer hover:scale-[1.02]' : '', 
        className
      ))}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
};

Card.displayName = 'Card';

// ==================== TEXT - FIXED FOR AUTO INVERSION ====================
// ✅ 'default' variant मा कुनै hardcoded color छैन - parent बाट inherit गर्छ
// ✅ 'muted' variant मा opacity मात्र प्रयोग गरिएको छ

export interface TextProps {
  variant?: TextVariant;
  size?: TextSize;
  weight?: TextWeight;
  align?: TextAlign;
  clamp?: number;
  children: React.ReactNode;
  className?: string;
  as?: 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'span' | 'div';
  color?: string;
  shade?: number | string;
  opacity?: number;
  style?: React.CSSProperties;
}

export const Text: React.FC<TextProps> = ({
  variant = 'default',
  size = 'md',
  weight = 'normal',
  align = 'left',
  clamp,
  children,
  className = '',
  as: Component = 'p',
  color,
  shade,
  opacity,
  style,
  ...props
}) => {
  // 🎯 FIX: 'default' variant लाई empty string दिने (parent बाट inherit हुनेछ)
  // 'muted' variant मा opacity मात्र प्रयोग गर्ने (hard color हटाइयो)
  const variantStyles = {
    default: '', // ⭐ Engine को auto color inherit गर्ने
    muted: 'opacity-70', // opacity मात्र, color parent बाट
    heading: 'font-bold',
    primary: textColor('blue', 180),
    success: textColor('green', 160),
    error: textColor('red', 160),
    warning: textColor('orange', 160),
  };

  const sizeStyles = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
    '2xl': 'text-2xl',
  };

  const weightStyles = {
    normal: 'font-normal',
    medium: 'font-medium',
    bold: 'font-bold',
  };

  const alignStyles = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  // 🎯 Logic: 
  // 1. यदि manual 'color' pathayeko छ भने त्यो use गर्ने
  // 2. नभए variant style use गर्ने
  // 3. 'default' variant भए engine को auto color use हुनेछ (किनकि variantStyles.default = '')
  let colorClass = '';
  if (color && shade !== undefined) {
    colorClass = textColor(color, shade, opacity);
  } else {
    colorClass = variantStyles[variant as keyof typeof variantStyles] || '';
  }

  const classList = cls(
    colorClass,
    sizeStyles[size],
    weightStyles[weight],
    alignStyles[align],
    clamp ? `line-clamp-${Math.min(6, Math.max(1, clamp))}` : '',
    className
  );

  return (
    <Component 
      className={ub(classList)} 
      style={style}
      {...props}
    >
      {children}
    </Component>
  );
};

Text.displayName = 'Text';

// ==================== BADGE ====================

export interface BadgeProps {
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  children: React.ReactNode;
  className?: string;
  color?: string;
  shade?: number | string;
  opacity?: number;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  color,
  shade,
  opacity,
  ...props
}) => {
  const variantConfig = {
    primary: { color: 'blue', shade: 180 },
    success: { color: 'green', shade: 160 },
    warning: { color: 'orange', shade: 160 },
    error: { color: 'red', shade: 160 },
    neutral: { color: 'gray', shade: 100 },
  };

  const config = color && shade !== undefined 
    ? { color, shade }
    : variantConfig[variant];

  const sizeStyles = {
    sm: cls('px-1.5 py-0.5', 'rounded-1', 'text-xs', 'font-medium'),
    md: cls('px-2 py-1', 'rounded-1.5', 'text-sm', 'font-medium'),
  };

  // Neutral variant मा manual text color चाहिन्छ (gray bg मा dark text)
  const isNeutral = variant === 'neutral' && !color;
  const neutralText = isNeutral ? textColor('gray', 220) : '';

  const classList = cls(
    bgColor(config.color, config.shade, opacity),
    neutralText,
    sizeStyles[size],
    'inline-flex items-center justify-center',
    className
  );

  return (
    <span className={ub(classList)} {...props}>
      {children}
    </span>
  );
};

Badge.displayName = 'Badge';

// ==================== LINK ====================

export interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  children: React.ReactNode;
  underline?: boolean;
  color?: string;
  shade?: number | string;
  hoverShade?: number | string;
}

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(({
  children,
  underline = true,
  color = 'blue',
  shade = 180,
  hoverShade,
  className = '',
  ...props
}, ref) => {
  const hoverColor = hoverShade 
    ? textColor(color, hoverShade)
    : textColor(color, typeof shade === 'number' ? shade + 20 : 200);

  return (
    <a
      ref={ref}
      className={ub(cls(
        textColor(color, shade),
        underline ? 'underline underline-offset-2' : '',
        `hover:${hoverColor}`,
        'transition-colors duration-200',
        className
      ))}
      {...props}
    >
      {children}
    </a>
  );
});

Link.displayName = 'Link';

// ==================== COLOR SWATCH ====================
// ✅ Engine को auto-inversion प्रयोग गर्ने
// ✅ कुनै manual text color override छैन

export interface ColorSwatchProps {
  color: string;
  shade: number | string;
  label?: string;
  showText?: boolean;
  className?: string;
  border?: boolean;
}

export const ColorSwatch: React.FC<ColorSwatchProps> = ({
  color,
  shade,
  label,
  showText = true,
  className = '',
  border = true,
}) => {
  const swatchClass = cls(
    'p-4 rounded-2',
    border ? 'border border-gray-200' : '',
    bgColor(color, shade), // Engine ले background herera auto text color दिनेछ
    className
  );

  return (
    <div className={ub(swatchClass)}>
      {showText && (
        <Text weight="medium">
          {label || `${color}-${shade}`}
        </Text>
      )}
    </div>
  );
};

ColorSwatch.displayName = 'ColorSwatch';

// ==================== COLOR GRID ====================

export interface ColorGridProps {
  color: string;
  shades: (number | string)[];
  title?: string;
  titleVariant?: TextVariant;
  columns?: 2 | 3 | 4;
  border?: boolean;
}

export const ColorGrid: React.FC<ColorGridProps> = ({
  color,
  shades,
  title,
  titleVariant = 'primary',
  columns = 4,
  border = true,
}) => {
  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-4',
  };

  return (
    <div className={ub('mb-6')}>
      {title && (
        <Text variant={titleVariant} weight="medium" className={ub('mb-2')}>
          {title}
        </Text>
      )}
      <div className={ub(`grid ${gridCols[columns]} gap-4`)}>
        {shades.map((shade) => (
          <ColorSwatch 
            key={`${color}-${shade}`}
            color={color}
            shade={shade}
            label={`${color}-${shade}`}
            border={border}
          />
        ))}
      </div>
    </div>
  );
};

ColorGrid.displayName = 'ColorGrid';

// ==================== COLOR PALETTE ====================

export interface ColorPaletteProps {
  colors: {
    name: string;
    shades: (number | string)[];
  }[];
  title?: string;
}

export const ColorPalette: React.FC<ColorPaletteProps> = ({
  colors,
  title,
}) => {
  return (
    <div className={ub('space-y-6')}>
      {title && (
        <Text variant="heading" size="lg" className={ub('mb-4')}>
          {title}
        </Text>
      )}
      {colors.map(({ name, shades }) => (
        <ColorGrid
          key={name}
          color={name}
          shades={shades}
          title={`✅ ${name.charAt(0).toUpperCase() + name.slice(1)} Text`}
          titleVariant={name as TextVariant}
        />
      ))}
    </div>
  );
};

ColorPalette.displayName = 'ColorPalette';

// ==================== EXPORT ====================

export const Core = {
  Button, Card, Text, Badge, Link,
  ColorSwatch, ColorGrid, ColorPalette,
  bgColor, textColor, borderColor
};

export default Core;