// /src/iot/IoTComponents.tsx - v17.13.0
// 🎛️ Complete IoT UI Components - LED, Gauge, LCD, Switch, etc.
// ✅ Fixed imports from ../lib/core
// ✅ Added missing layout components
// ✅ Auto-inversion ready

import React from 'react';
import { Card, Text, Badge, Button } from '../components';
import { ub } from '../mycss';

// ==================== LAYOUT HELPERS ====================

interface RowProps {
  children: React.ReactNode;
  gap?: number;
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  className?: string;
}

const Row: React.FC<RowProps> = ({ 
  children, 
  gap = 2, 
  align = 'center', 
  justify = 'start',
  className = ''
}) => {
  const justifyMap = {
    start: 'flex-start',
    center: 'center',
    end: 'flex-end',
    between: 'space-between',
    around: 'space-around'
  };

  return (
    <div 
      className={className}
      style={{ 
        display: 'flex', 
        gap: `${gap * 4}px`, 
        alignItems: align,
        justifyContent: justifyMap[justify],
        width: '100%'
      }}
    >
      {children}
    </div>
  );
};

interface StackProps {
  children: React.ReactNode;
  gap?: number;
  className?: string;
}

const Stack: React.FC<StackProps> = ({ children, gap = 2, className = '' }) => (
  <div 
    className={className}
    style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: `${gap * 4}px`,
      width: '100%'
    }}
  >
    {children}
  </div>
);

interface CenterProps {
  children: React.ReactNode;
  className?: string;
}

const Center: React.FC<CenterProps> = ({ children, className = '' }) => (
  <div 
    className={className}
    style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center',
      width: '100%'
    }}
  >
    {children}
  </div>
);

interface GridProps {
  children: React.ReactNode;
  cols?: number;
  gap?: number;
  className?: string;
}

const Grid: React.FC<GridProps> = ({ children, cols = 2, gap = 4, className = '' }) => (
  <div 
    className={className}
    style={{ 
      display: 'grid', 
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gap: `${gap * 4}px`,
      width: '100%'
    }}
  >
    {children}
  </div>
);

// ==================== TYPES ====================

export interface IoTProps {
  className?: string;
  style?: React.CSSProperties;
}

// ==================== LED INDICATOR ====================

interface LEDProps extends IoTProps {
  active?: boolean;
  color?: 'red' | 'green' | 'yellow' | 'blue' | 'purple' | 'white';
  size?: 'sm' | 'md' | 'lg';
  blinking?: boolean;
  label?: string;
  showLabel?: boolean;
}

export const LED: React.FC<LEDProps> = ({
  active = false,
  color = 'green',
  size = 'md',
  blinking = false,
  label,
  showLabel = true,
  className = '',
  style
}) => {
  const colors = {
    red: '#ff0000',
    green: '#00ff00',
    yellow: '#ffff00',
    blue: '#00ffff',
    purple: '#ff00ff',
    white: '#ffffff'
  };

  const sizes = {
    sm: 16,
    md: 24,
    lg: 32
  };

  return (
    <Card padding={3} variant="glass" className={className} style={{ width: '100%', ...style }}>
      <Row gap={2} align="center">
        <div
          style={{
            width: sizes[size],
            height: sizes[size],
            borderRadius: '50%',
            backgroundColor: active ? colors[color] : '#333',
            boxShadow: active ? `0 0 ${sizes[size]}px ${colors[color]}` : 'none',
            animation: blinking && active ? 'blink 1s infinite' : 'none',
            transition: 'all 0.2s',
          }}
        />
        {showLabel && (label || color) && (
          <Stack gap={0}>
            <Text weight="bold">{label || color}</Text>
            <Text size="sm" variant="muted">{active ? 'ON' : 'OFF'}</Text>
          </Stack>
        )}
      </Row>
      <style>{`
        @keyframes blink {
          0% { opacity: 1; }
          50% { opacity: 0.3; }
          100% { opacity: 1; }
        }
      `}</style>
    </Card>
  );
};

// ==================== ANALOG GAUGE ====================

interface GaugeProps extends IoTProps {
  value: number;
  min?: number;
  max?: number;
  label?: string;
  unit?: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  thresholds?: {
    warning?: number;
    danger?: number;
  };
}

export const Gauge: React.FC<GaugeProps> = ({
  value,
  min = 0,
  max = 100,
  label,
  unit = '',
  color = '#00ff00',
  size = 'md',
  showValue = true,
  thresholds = { warning: 70, danger: 90 },
  className = '',
  style
}) => {
  const percentage = ((value - min) / (max - min)) * 100;
  
  let gaugeColor = color;
  if (value >= thresholds.danger!) gaugeColor = '#ff0000';
  else if (value >= thresholds.warning!) gaugeColor = '#ffff00';

  const sizes = {
    sm: { height: 12, fontSize: '12px' },
    md: { height: 16, fontSize: '14px' },
    lg: { height: 20, fontSize: '16px' }
  };

  return (
    <Card variant="glass" padding={4} className={className} style={{ width: '100%', ...style }}>
      <Stack gap={3}>
        {label && <Text weight="bold">{label}</Text>}
        
        <div style={{ 
          width: '100%',
          height: sizes[size].height,
          background: '#222',
          borderRadius: '4px',
          overflow: 'hidden',
          position: 'relative'
        }}>
          <div style={{
            width: `${Math.min(100, Math.max(0, percentage))}%`,
            height: '100%',
            background: gaugeColor,
            transition: 'width 0.3s ease'
          }} />
          
          <div style={{
            position: 'absolute',
            top: 0,
            left: `${thresholds.warning}%`,
            height: '100%',
            width: '2px',
            background: '#ffff00',
            opacity: 0.5
          }} />
          <div style={{
            position: 'absolute',
            top: 0,
            left: `${thresholds.danger}%`,
            height: '100%',
            width: '2px',
            background: '#ff0000',
            opacity: 0.5
          }} />
        </div>
        
        {showValue && (
          <Row justify="between">
            <Text size={size} style={{ color: gaugeColor, fontWeight: 'bold' }}>
              {value.toFixed(1)} {unit}
            </Text>
            <Text size="sm" variant="muted">
              {min} - {max}
            </Text>
          </Row>
        )}
      </Stack>
    </Card>
  );
};

// ==================== LCD DISPLAY ====================

interface LCDProps extends IoTProps {
  value: number | string;
  label?: string;
  unit?: string;
  digits?: number;
  showBackground?: boolean;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
  font?: 'digital' | 'lcd' | 'normal';
}

export const LCD: React.FC<LCDProps> = ({
  value,
  label,
  unit,
  digits = 6,
  showBackground = true,
  color = '#00ff00',
  size = 'md',
  font = 'digital',
  className = '',
  style
}) => {
  const formattedValue = typeof value === 'number' 
    ? value.toFixed(2).padStart(digits, '0')
    : value.toString();

  const sizes = {
    sm: { fontSize: '20px', padding: '8px 12px' },
    md: { fontSize: '28px', padding: '12px 16px' },
    lg: { fontSize: '36px', padding: '16px 20px' }
  };

  const fonts = {
    digital: 'monospace',
    lcd: 'Courier New, monospace',
    normal: 'inherit'
  };

  return (
    <Card variant="glass" padding={4} className={className} style={{ width: '100%', ...style }}>
      <Stack gap={2}>
        {label && <Text weight="bold">{label}</Text>}
        
        <div style={{
          background: showBackground ? '#111' : 'transparent',
          padding: sizes[size].padding,
          borderRadius: '8px',
          border: showBackground ? '2px solid #333' : 'none',
          width: '100%'
        }}>
          <Text 
            style={{ 
              color,
              fontFamily: fonts[font],
              fontSize: sizes[size].fontSize,
              textShadow: `0 0 8px ${color}`,
              letterSpacing: '4px',
              textAlign: 'center'
            }}
          >
            {formattedValue} {unit}
          </Text>
        </div>
      </Stack>
    </Card>
  );
};

// ==================== TOGGLE SWITCH ====================

interface SwitchProps extends IoTProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  color?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  checked = false,
  onChange,
  label,
  size = 'md',
  disabled = false,
  color = '#00ff00',
  className = '',
  style
}) => {
  const sizes = {
    sm: { width: 60, height: 30, circle: 26 },
    md: { width: 80, height: 40, circle: 36 },
    lg: { width: 100, height: 50, circle: 46 }
  };

  return (
    <Card padding={3} variant="glass" className={className} style={{ width: '100%', ...style }}>
      <Row gap={3} align="center">
        <button
          onClick={() => !disabled && onChange?.(!checked)}
          disabled={disabled}
          style={{
            width: sizes[size].width,
            height: sizes[size].height,
            background: checked ? color : '#333',
            borderRadius: sizes[size].height / 2,
            position: 'relative',
            border: 'none',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.5 : 1,
            transition: 'background 0.2s',
          }}
        >
          <div style={{
            width: sizes[size].circle,
            height: sizes[size].circle,
            background: '#fff',
            borderRadius: '50%',
            position: 'absolute',
            top: (sizes[size].height - sizes[size].circle) / 2,
            left: checked ? sizes[size].width - sizes[size].circle - 2 : 2,
            transition: 'left 0.2s'
          }} />
        </button>
        
        {label && (
          <Stack gap={0}>
            <Text weight="bold">{label}</Text>
            <Text size="sm" variant="muted">{checked ? 'ON' : 'OFF'}</Text>
          </Stack>
        )}
      </Row>
    </Card>
  );
};

// ==================== PROGRESS BAR ====================

interface ProgressProps extends IoTProps {
  value: number;
  max?: number;
  label?: string;
  color?: string;
  height?: number;
  showValue?: boolean;
  animated?: boolean;
}

export const Progress: React.FC<ProgressProps> = ({
  value,
  max = 100,
  label,
  color = '#00ff00',
  height = 20,
  showValue = true,
  animated = false,
  className = '',
  style
}) => {
  const percentage = (value / max) * 100;

  return (
    <Card variant="glass" padding={4} className={className} style={{ width: '100%', ...style }}>
      <Stack gap={2}>
        {label && <Text weight="bold">{label}</Text>}
        
        <div style={{
          width: '100%',
          height,
          background: '#222',
          borderRadius: height / 2,
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${percentage}%`,
            height: '100%',
            background: color,
            borderRadius: height / 2,
            transition: animated ? 'width 0.5s ease' : 'none',
            animation: animated ? 'progressPulse 1s infinite' : 'none'
          }} />
        </div>
        
        {showValue && (
          <Row justify="between">
            <Text size="lg" weight="bold" style={{ color }}>
              {value} / {max}
            </Text>
            <Text size="md" variant="muted">{percentage.toFixed(1)}%</Text>
          </Row>
        )}
      </Stack>
      <style>{`
        @keyframes progressPulse {
          0% { opacity: 1; }
          50% { opacity: 0.7; }
          100% { opacity: 1; }
        }
      `}</style>
    </Card>
  );
};

// ==================== METER (Vertical) ====================

interface MeterProps extends IoTProps {
  value: number;
  min?: number;
  max?: number;
  label?: string;
  color?: string;
  height?: number;
  width?: number;
}

export const Meter: React.FC<MeterProps> = ({
  value,
  min = 0,
  max = 100,
  label,
  color = '#00ff00',
  height = 200,
  width = 60,
  className = '',
  style
}) => {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <Card variant="glass" padding={4} className={className} style={{ width: '100%', ...style }}>
      <Stack gap={2}>
        {label && <Text weight="bold">{label}</Text>}
        
        <Center>
          <div style={{
            width,
            height,
            background: '#222',
            borderRadius: width / 2,
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{
              width: '100%',
              height: `${percentage}%`,
              background: color,
              position: 'absolute',
              bottom: 0,
              left: 0,
              transition: 'height 0.3s ease'
            }} />
          </div>
        </Center>
        
        <Center>
          <Text size="xl" weight="bold" style={{ color }}>
            {value.toFixed(1)}
          </Text>
          <Text size="sm" variant="muted">{min} - {max}</Text>
        </Center>
      </Stack>
    </Card>
  );
};

// ==================== THERMOMETER ====================

interface ThermometerProps extends IoTProps {
  temperature: number;
  min?: number;
  max?: number;
  unit?: 'C' | 'F';
  size?: 'sm' | 'md' | 'lg';
}

export const Thermometer: React.FC<ThermometerProps> = ({
  temperature,
  min = -20,
  max = 50,
  unit = 'C',
  size = 'md',
  className = '',
  style
}) => {
  const percentage = ((temperature - min) / (max - min)) * 100;
  
  let color = '#00ffff';
  if (temperature > 35) color = '#ff0000';
  else if (temperature < 5) color = '#00ffff';
  else color = '#ffff00';

  const sizes = {
    sm: { width: 40, height: 200, fontSize: '16px' },
    md: { width: 50, height: 250, fontSize: '18px' },
    lg: { width: 60, height: 300, fontSize: '20px' }
  };

  return (
    <Card variant="glass" padding={4} className={className} style={{ width: '100%', ...style }}>
      <Stack gap={2}>
        <Text weight="bold">Temperature</Text>
        
        <Center>
          <div style={{
            width: sizes[size].width,
            height: sizes[size].height,
            background: '#222',
            borderRadius: sizes[size].width / 2,
            position: 'relative',
            border: '2px solid #444'
          }}>
            <div style={{
              width: '100%',
              height: `${percentage}%`,
              background: color,
              borderRadius: sizes[size].width / 2,
              position: 'absolute',
              bottom: 0,
              left: 0,
              transition: 'height 0.3s ease'
            }} />
            
            <div style={{
              width: sizes[size].width * 2,
              height: sizes[size].width * 2,
              background: color,
              borderRadius: '50%',
              position: 'absolute',
              bottom: -sizes[size].width,
              left: -sizes[size].width / 2,
              boxShadow: `0 0 20px ${color}`
            }} />
          </div>
        </Center>
        
        <Center>
          <Text size="xl" weight="bold" style={{ color }}>
            {temperature}°{unit}
          </Text>
        </Center>
      </Stack>
    </Card>
  );
};

// ==================== SEVEN SEGMENT DISPLAY ====================

interface SevenSegmentProps extends IoTProps {
  value: number | string;
  digits?: number;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const SevenSegment: React.FC<SevenSegmentProps> = ({
  value,
  digits = 4,
  color = '#ff0000',
  size = 'md',
  className = '',
  style
}) => {
  const str = value.toString().padStart(digits, '0').slice(-digits);
  
  const sizes = {
    sm: { width: 60, height: 80, fontSize: '48px' },
    md: { width: 80, height: 100, fontSize: '64px' },
    lg: { width: 100, height: 120, fontSize: '80px' }
  };

  return (
    <Card variant="glass" padding={4} className={className} style={{ width: '100%', ...style }}>
      <Stack gap={2}>
        <Text weight="bold">Digital Display</Text>
        
        <Row gap={2} justify="center">
          {str.split('').map((digit, i) => (
            <div
              key={i}
              style={{
                width: sizes[size].width,
                height: sizes[size].height,
                background: '#111',
                borderRadius: '8px',
                border: '2px solid #333',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color,
                fontSize: sizes[size].fontSize,
                fontFamily: 'monospace',
                textShadow: `0 0 10px ${color}`
              }}
            >
              {digit}
            </div>
          ))}
        </Row>
      </Stack>
    </Card>
  );
};

// ==================== PANEL METER ====================

interface PanelMeterProps extends IoTProps {
  value: number;
  min?: number;
  max?: number;
  label?: string;
  size?: number;
}

export const PanelMeter: React.FC<PanelMeterProps> = ({
  value,
  min = 0,
  max = 100,
  label,
  size = 200,
  className = '',
  style
}) => {
  const percentage = ((value - min) / (max - min)) * 180;
  const angle = -90 + percentage;

  return (
    <Card variant="glass" padding={4} className={className} style={{ width: '100%', ...style }}>
      <Stack gap={2}>
        {label && <Text weight="bold">{label}</Text>}
        
        <Center>
          <div style={{
            width: size,
            height: size / 2 + 20,
            position: 'relative'
          }}>
            <svg width={size} height={size / 2 + 20} viewBox={`0 0 ${size} ${size / 2 + 20}`}>
              <path
                d={`M 20,${size/2} A ${size/2 - 20},${size/2 - 20} 0 0 1 ${size - 20},${size/2}`}
                fill="none"
                stroke="#333"
                strokeWidth="12"
              />
              
              <path
                d={`M 20,${size/2} A ${size/2 - 20},${size/2 - 20} 0 0 1 ${size - 20},${size/2}`}
                fill="none"
                stroke={percentage > 160 ? '#ff0000' : percentage > 120 ? '#ffff00' : '#00ff00'}
                strokeWidth="12"
                strokeDasharray={`${percentage} 180`}
              />
              
              <line
                x1={size / 2}
                y1={size / 2}
                x2={size / 2 + Math.cos(angle * Math.PI / 180) * (size / 2 - 30)}
                y2={size / 2 + Math.sin(angle * Math.PI / 180) * (size / 2 - 30)}
                stroke="#fff"
                strokeWidth="3"
              />
              
              <circle cx={size / 2} cy={size / 2} r="8" fill="#fff" />
              
              <text x={30} y={size / 2 - 10} fill="#666" fontSize="12">{min}</text>
              <text x={size - 40} y={size / 2 - 10} fill="#666" fontSize="12">{max}</text>
            </svg>
            
            <Center>
              <Text size="xl" weight="bold" style={{ color: '#00ffff', marginTop: 10 }}>
                {value}
              </Text>
            </Center>
          </div>
        </Center>
      </Stack>
    </Card>
  );
};

// ==================== EXPORT ====================

export const IoTComponents = {
  LED,
  Gauge,
  LCD,
  Switch,
  Progress,
  Meter,
  Thermometer,
  SevenSegment,
  PanelMeter,
  // Layout helpers
  Row,
  Stack,
  Center,
  Grid
};

export default IoTComponents;