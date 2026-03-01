// /src/css/components/layout.tsx
// 🏗️ Complete Layout Components - Grid, Stack, Container, etc.

import React from 'react';
import { ub } from '../mycss';

// ==================== UTILITIES ====================

const cls = (...classes: (string | undefined | false | null)[]): string => {
  return classes.filter(Boolean).join(' ');
};

const safeUb = (classString: string): string => {
  return ub(classString);
};

// ==================== CONTAINER ====================

export interface ContainerProps {
  children: React.ReactNode;
  maxWidth?: number | string;
  padding?: number | string;
  paddingTop?: number | string;
  paddingBottom?: number | string;
  paddingLeft?: number | string;
  paddingRight?: number | string;
  center?: boolean;
  className?: string;
  fluid?: boolean;
}

export const Container: React.FC<ContainerProps> = ({
  children,
  maxWidth = 128,
  padding = 4,
  paddingTop,
  paddingBottom,
  paddingLeft,
  paddingRight,
  center = true,
  className = '',
  fluid = false,
  ...props
}) => {
  const paddingClasses = safeUb(cls(
    paddingTop ? `pt-${paddingTop}` : `pt-${padding}`,
    paddingBottom ? `pb-${paddingBottom}` : `pb-${padding}`,
    paddingLeft ? `pl-${paddingLeft}` : `pl-${padding}`,
    paddingRight ? `pr-${paddingRight}` : `pr-${padding}`
  ));

  const containerClass = safeUb(cls(
    'w-full',
    paddingClasses,
    center ? 'mx-auto' : '',
    fluid ? '' : 'px-4',
    className
  ));

  return (
    <div
      className={containerClass}
      style={{ 
        maxWidth: !fluid ? (typeof maxWidth === 'number' ? `${maxWidth * 4}px` : maxWidth) : '100%',
      }}
      {...props}
    >
      {children}
    </div>
  );
};

// ==================== GRID ====================

export interface GridProps {
  children: React.ReactNode;
  cols?: number;
  colsSm?: number;
  colsMd?: number;
  colsLg?: number;
  gap?: number | string;
  gapX?: number | string;
  gapY?: number | string;
  className?: string;
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
}

export const Grid: React.FC<GridProps> = ({
  children,
  cols = 12,
  colsSm = 1,
  colsMd = 2,
  colsLg = 4,
  gap = 4,
  gapX,
  gapY,
  className = '',
  align = 'stretch',
  justify = 'start',
  ...props
}) => {
  const gapValue = typeof gap === 'number' ? `${gap * 4}px` : gap;
  const gapXValue = gapX ? (typeof gapX === 'number' ? `${gapX * 4}px` : gapX) : gapValue;
  const gapYValue = gapY ? (typeof gapY === 'number' ? `${gapY * 4}px` : gapY) : gapValue;

  const alignMap = { start: 'start', center: 'center', end: 'end', stretch: 'stretch' };
  const justifyMap = { start: 'start', center: 'center', end: 'end', between: 'space-between', around: 'space-around' };

  return (
    <div
      className={cls(className)}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: `${gapYValue} ${gapXValue}`,
        alignItems: alignMap[align],
        justifyItems: justifyMap[justify],
      }}
      {...props}
    >
      {children}
    </div>
  );
};

// ==================== GRID ITEM ====================

export interface GridItemProps {
  children: React.ReactNode;
  colSpan?: number;
  colSpanSm?: number;
  colSpanMd?: number;
  colSpanLg?: number;
  rowSpan?: number;
  className?: string;
}

export const GridItem: React.FC<GridItemProps> = ({
  children,
  colSpan = 1,
  rowSpan = 1,
  className = '',
  ...props
}) => {
  return (
    <div
      className={cls(className)}
      style={{
        gridColumn: `span ${colSpan}`,
        gridRow: `span ${rowSpan}`,
      }}
      {...props}
    >
      {children}
    </div>
  );
};

// ==================== STACK (FLEX COLUMN) ====================

export interface StackProps {
  children: React.ReactNode;
  gap?: number | string;
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  className?: string;
  wrap?: boolean;
}

export const Stack: React.FC<StackProps> = ({
  children,
  gap = 4,
  align = 'stretch',
  justify = 'start',
  className = '',
  wrap = false,
  ...props
}) => {
  const alignMap = { start: 'flex-start', center: 'center', end: 'flex-end', stretch: 'stretch' };
  const justifyMap = { 
    start: 'flex-start', center: 'center', end: 'flex-end', 
    between: 'space-between', around: 'space-around', evenly: 'space-evenly' 
  };

  return (
    <div
      className={cls(className)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: typeof gap === 'number' ? `${gap * 4}px` : gap,
        alignItems: alignMap[align],
        justifyContent: justifyMap[justify],
        flexWrap: wrap ? 'wrap' : 'nowrap',
      }}
      {...props}
    >
      {children}
    </div>
  );
};

// ==================== ROW (FLEX ROW) ====================

export interface RowProps {
  children: React.ReactNode;
  gap?: number | string;
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  className?: string;
  wrap?: boolean;
}

export const Row: React.FC<RowProps> = ({
  children,
  gap = 4,
  align = 'center',
  justify = 'start',
  className = '',
  wrap = true,
  ...props
}) => {
  const alignMap = { 
    start: 'flex-start', center: 'center', end: 'flex-end', 
    stretch: 'stretch', baseline: 'baseline' 
  };
  const justifyMap = { 
    start: 'flex-start', center: 'center', end: 'flex-end', 
    between: 'space-between', around: 'space-around', evenly: 'space-evenly' 
  };

  return (
    <div
      className={cls(className)}
      style={{
        display: 'flex',
        flexDirection: 'row',
        gap: typeof gap === 'number' ? `${gap * 4}px` : gap,
        alignItems: alignMap[align],
        justifyContent: justifyMap[justify],
        flexWrap: wrap ? 'wrap' : 'nowrap',
      }}
      {...props}
    >
      {children}
    </div>
  );
};

// ==================== FLEX (GENERIC) ====================

export interface FlexProps {
  children: React.ReactNode;
  direction?: 'row' | 'col' | 'row-reverse' | 'col-reverse';
  gap?: number | string;
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  className?: string;
  wrap?: boolean;
  flex?: number | string;
}

export const Flex: React.FC<FlexProps> = ({
  children,
  direction = 'row',
  gap = 4,
  align = 'start',
  justify = 'start',
  className = '',
  wrap = false,
  flex,
  ...props
}) => {
  const alignMap = { 
    start: 'flex-start', center: 'center', end: 'flex-end', 
    stretch: 'stretch', baseline: 'baseline' 
  };
  const justifyMap = { 
    start: 'flex-start', center: 'center', end: 'flex-end', 
    between: 'space-between', around: 'space-around', evenly: 'space-evenly' 
  };

  return (
    <div
      className={cls(className)}
      style={{
        display: 'flex',
        flexDirection: direction,
        gap: typeof gap === 'number' ? `${gap * 4}px` : gap,
        alignItems: alignMap[align],
        justifyContent: justifyMap[justify],
        flexWrap: wrap ? 'wrap' : 'nowrap',
        flex: flex,
      }}
      {...props}
    >
      {children}
    </div>
  );
};

// ==================== DIVIDER ====================

export interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  thickness?: number;
  color?: string;
  className?: string;
  spacing?: number;
}

export const Divider: React.FC<DividerProps> = ({
  orientation = 'horizontal',
  thickness = 1,
  color = 'gray-150',
  className = '',
  spacing = 4,
}) => {
  const isHorizontal = orientation === 'horizontal';
  
  return (
    <hr
      className={safeUb(cls(
        isHorizontal ? 'w-full' : 'h-full',
        'border-0',
        `bg-${color}`,
        className
      ))}
      style={{
        [isHorizontal ? 'height' : 'width']: thickness,
        margin: isHorizontal ? `${spacing * 4}px 0` : `0 ${spacing * 4}px`,
      }}
    />
  );
};

// ==================== CENTER ====================

export interface CenterProps {
  children: React.ReactNode;
  className?: string;
  fullWidth?: boolean;
  fullHeight?: boolean;
}

export const Center: React.FC<CenterProps> = ({ 
  children, 
  className = '',
  fullWidth = false,
  fullHeight = false,
}) => {
  return (
    <div
      className={safeUb(cls(
        'flex items-center justify-center',
        fullWidth ? 'w-full' : '',
        fullHeight ? 'h-full' : '',
        className
      ))}
    >
      {children}
    </div>
  );
};

// ==================== SPACER ====================

export interface SpacerProps {
  size?: number | string;
  axis?: 'horizontal' | 'vertical';
}

export const Spacer: React.FC<SpacerProps> = ({ 
  size = 4, 
  axis = 'vertical' 
}) => {
  return (
    <div
      style={{
        [axis === 'vertical' ? 'height' : 'width']: typeof size === 'number' ? `${size * 4}px` : size,
        [axis === 'vertical' ? 'width' : 'height']: 1,
        flexShrink: 0,
      }}
    />
  );
};

// ==================== BOX ====================

export interface BoxProps {
  children: React.ReactNode;
  padding?: number | string;
  paddingTop?: number | string;
  paddingBottom?: number | string;
  paddingLeft?: number | string;
  paddingRight?: number | string;
  margin?: number | string;
  marginTop?: number | string;
  marginBottom?: number | string;
  marginLeft?: number | string;
  marginRight?: number | string;
  className?: string;
  width?: number | string;
  height?: number | string;
  bg?: string;
  rounded?: number | string;
  shadow?: boolean | string;
}

export const Box: React.FC<BoxProps> = ({
  children,
  padding,
  paddingTop,
  paddingBottom,
  paddingLeft,
  paddingRight,
  margin,
  marginTop,
  marginBottom,
  marginLeft,
  marginRight,
  className = '',
  width,
  height,
  bg,
  rounded,
  shadow,
  ...props
}) => {
  const paddingClasses = safeUb(cls(
    padding ? `p-${padding}` : '',
    paddingTop ? `pt-${paddingTop}` : '',
    paddingBottom ? `pb-${paddingBottom}` : '',
    paddingLeft ? `pl-${paddingLeft}` : '',
    paddingRight ? `pr-${paddingRight}` : ''
  ));

  const marginClasses = safeUb(cls(
    margin ? `m-${margin}` : '',
    marginTop ? `mt-${marginTop}` : '',
    marginBottom ? `mb-${marginBottom}` : '',
    marginLeft ? `ml-${marginLeft}` : '',
    marginRight ? `mr-${marginRight}` : ''
  ));

  const bgClass = bg ? safeUb(`bg-${bg}`) : '';
  const roundedClass = rounded ? safeUb(`rounded-${rounded}`) : '';
  const shadowClass = shadow ? (shadow === true ? safeUb('shadow-2') : safeUb(`shadow-${shadow}`)) : '';

  return (
    <div
      className={cls(
        paddingClasses,
        marginClasses,
        bgClass,
        roundedClass,
        shadowClass,
        className
      )}
      style={{
        width: width ? (typeof width === 'number' ? `${width * 4}px` : width) : undefined,
        height: height ? (typeof height === 'number' ? `${height * 4}px` : height) : undefined,
      }}
      {...props}
    >
      {children}
    </div>
  );
};

// ==================== HIDE (RESPONSIVE) ====================

export interface HideProps {
  children: React.ReactNode;
  below?: 'sm' | 'md' | 'lg';
  above?: 'sm' | 'md' | 'lg';
}

export const Hide: React.FC<HideProps> = ({ 
  children, 
  below, 
  above 
}) => {
  let className = '';
  
  if (below === 'sm') className = 'hidden sm:block';
  else if (below === 'md') className = 'hidden md:block';
  else if (below === 'lg') className = 'hidden lg:block';
  
  if (above === 'sm') className = 'block sm:hidden';
  else if (above === 'md') className = 'block md:hidden';
  else if (above === 'lg') className = 'block lg:hidden';
  
  return <div className={className}>{children}</div>;
};

// ==================== SHOW (RESPONSIVE) ====================

export interface ShowProps {
  children: React.ReactNode;
  below?: 'sm' | 'md' | 'lg';
  above?: 'sm' | 'md' | 'lg';
}

export const Show: React.FC<ShowProps> = ({ 
  children, 
  below, 
  above 
}) => {
  let className = '';
  
  if (below === 'sm') className = 'block sm:hidden';
  else if (below === 'md') className = 'block md:hidden';
  else if (below === 'lg') className = 'block lg:hidden';
  
  if (above === 'sm') className = 'hidden sm:block';
  else if (above === 'md') className = 'hidden md:block';
  else if (above === 'lg') className = 'hidden lg:block';
  
  return <div className={className}>{children}</div>;
};

// ==================== Z-INDEX ====================

export interface ZIndexProps {
  children: React.ReactNode;
  level: 0 | 10 | 20 | 30 | 40 | 50 | 'auto';
  className?: string;
}

export const ZIndex: React.FC<ZIndexProps> = ({ 
  children, 
  level, 
  className = '' 
}) => {
  const zClasses = {
    0: 'z-0',
    10: 'z-10',
    20: 'z-20',
    30: 'z-30',
    40: 'z-40',
    50: 'z-50',
    auto: 'z-auto'
  };

  return (
    <div className={safeUb(cls(zClasses[level], className))}>
      {children}
    </div>
  );
};

// ==================== OVERFLOW ====================

export interface OverflowProps {
  children: React.ReactNode;
  x?: 'auto' | 'hidden' | 'visible' | 'scroll';
  y?: 'auto' | 'hidden' | 'visible' | 'scroll';
  className?: string;
}

export const Overflow: React.FC<OverflowProps> = ({ 
  children, 
  x = 'visible', 
  y = 'visible',
  className = '' 
}) => {
  return (
    <div
      className={className}
      style={{
        overflowX: x,
        overflowY: y,
      }}
    >
      {children}
    </div>
  );
};

// ==================== POSITION ====================

export interface PositionProps {
  children: React.ReactNode;
  type: 'static' | 'relative' | 'absolute' | 'fixed' | 'sticky';
  top?: number | string;
  right?: number | string;
  bottom?: number | string;
  left?: number | string;
  className?: string;
}

export const Position: React.FC<PositionProps> = ({ 
  children, 
  type,
  top,
  right,
  bottom,
  left,
  className = '' 
}) => {
  const positionStyles: React.CSSProperties = {
    position: type,
  };

  if (top !== undefined) positionStyles.top = typeof top === 'number' ? `${top * 4}px` : top;
  if (right !== undefined) positionStyles.right = typeof right === 'number' ? `${right * 4}px` : right;
  if (bottom !== undefined) positionStyles.bottom = typeof bottom === 'number' ? `${bottom * 4}px` : bottom;
  if (left !== undefined) positionStyles.left = typeof left === 'number' ? `${left * 4}px` : left;

  return (
    <div className={className} style={positionStyles}>
      {children}
    </div>
  );
};

// ==================== SECTION ====================

export interface SectionProps {
  children: React.ReactNode;
  bg?: string;
  padding?: number | string;
  className?: string;
  id?: string;
}

export const Section: React.FC<SectionProps> = ({
  children,
  bg,
  padding = 8,
  className = '',
  id,
}) => {
  const bgClass = bg ? safeUb(`bg-${bg}`) : '';
  
  return (
    <section
      id={id}
      className={safeUb(cls(
        'w-full',
        bgClass,
        `py-${padding}`,
        className
      ))}
    >
      <Container>
        {children}
      </Container>
    </section>
  );
};

// ==================== EXPORT ALL ====================

export const Layout = {
  Container,
  Grid,
  GridItem,
  Stack,
  Row,
  Flex,
  Divider,
  Center,
  Spacer,
  Box,
  Hide,
  Show,
  ZIndex,
  Overflow,
  Position,
  Section,
};

export default Layout;