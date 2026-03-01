// /src/App.jsx
import React, { useState } from 'react';
import { ub } from './css/mycss';
import { Core } from './css/components';

const { Button, Card, Text, Badge, Link, ColorPalette, ColorGrid, ColorSwatch } = Core;

function App() {
  const [feedback, setFeedback] = useState('idle');
  const [loading, setLoading] = useState(false);

  const handleClick = (type) => {
    setFeedback(type);
    setTimeout(() => setFeedback('idle'), 2000);
  };

  const handleLoading = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <div className={ub("min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8")}>
      <div className={ub("max-w-6xl mx-auto")}>
        {/* Header */}
        <div className={ub("text-center mb-8")}>
          <h1 className={ub("text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600")}>
            🎯 Core Components Test
          </h1>
          <Text variant="muted" size="lg">
            Testing Button, Card, Text, Badge, Link with auto color inversion
          </Text>
        </div>

        {/* TEXT COMPONENT TEST */}
        // /src/App.jsx - Text Component Test को भाग मात्र

{/* TEXT COMPONENT TEST - सबैभन्दा महत्वपूर्ण */}
<Card variant="default" className={ub("mb-8")}>
  <Text variant="heading" size="xl" className={ub("mb-4")}>
    📝 Text Component Test (Auto Inversion)
  </Text>
  
  <div className={ub("space-y-4")}>
    {/* Default - Parent बाट inherit - अब parent मा color दिइएको */}
    <div className={ub("p-4 bg-gray-20 rounded-2 text-gray-220")}>
      <Text>Default text - inherits parent color (gray bg मा auto white/black)</Text>
    </div>

    {/* Different variants - अब प्रत्येक div मा color दिइएको */}
    <div className={ub("grid grid-cols-3 gap-4")}>
      <div className={ub("p-4 bg-blue-180 rounded-2 text-white")}>
        <Text variant="primary">Primary on Blue</Text>
      </div>
      <div className={ub("p-4 bg-green-160 rounded-2 text-white")}>
        <Text variant="success">Success on Green</Text>
      </div>
      <div className={ub("p-4 bg-red-160 rounded-2 text-white")}>
        <Text variant="error">Error on Red</Text>
      </div>
    </div>
    {/* Different variants - Text मा नै variant दिएको */}
<div className={ub("grid grid-cols-3 gap-4")}>
  <div className={ub("p-4 bg-blue-180 rounded-2")}>
    <Text variant="primary">Primary on Blue</Text>  {/* Text ले नै color ल्याउँछ */}
  </div>
  <div className={ub("p-4 bg-green-160 rounded-2")}>
    <Text variant="success">Success on Green</Text>  {/* Text ले नै color ल्याउँछ */}
  </div>
  <div className={ub("p-4 bg-red-160 rounded-2")}>
    <Text variant="error">Error on Red</Text>  {/* Text ले नै color ल्याउँछ */}
  </div>
</div>

    {/* Muted test */}
    <div className={ub("p-4 bg-purple-180 rounded-2 text-white")}>
      <Text variant="default">Normal text </Text>
      <Text variant="muted">Muted text (70% opacity)</Text>
    </div>

    {/* Manual colors */}
    <div className={ub("p-4 bg-amber-160 rounded-2 ")}>
      <Text color="amber" shade={220}>Manual amber-220 text</Text>
    </div>

    {/* Size test */}
    <div className={ub("flex items-end gap-4 p-4 bg-gray-20 rounded-2 text-gray-220")}>
      <Text size="xs">XS Text</Text>
      <Text size="sm">SM Text</Text>
      <Text size="md">MD Text</Text>
      <Text size="lg">LG Text</Text>
      <Text size="xl">XL Text</Text>
      <Text size="2xl">2XL Text</Text>
    </div>

    {/* Weight test */}
    <div className={ub("p-4 bg-gray-20 rounded-2 text-gray-220")}>
      <Text weight="normal">Normal weight</Text>{' '}
      <Text weight="medium">Medium weight</Text>{' '}
      <Text weight="bold">Bold weight</Text>
    </div>
  </div>
</Card>

        {/* BUTTON TEST */}
        <Card variant="default" className={ub("mb-8")}>
          <Text variant="heading" size="xl" className={ub("mb-4")}>
            🎮 Button Test
          </Text>

          <div className={ub("space-y-4")}>
            <Text variant="primary" weight="medium">Variants:</Text>
            <div className={ub("flex gap-4 flex-wrap")}>
              <Button variant="primary">Primary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="glass">Glass</Button>
            </div>

            <Text variant="primary" weight="medium" className={ub("mt-4")}>Sizes:</Text>
            <div className={ub("flex gap-4 items-center flex-wrap")}>
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
            </div>

            <Text variant="primary" weight="medium" className={ub("mt-4")}>Feedback:</Text>
            <div className={ub("flex gap-4 flex-wrap")}>
              <Button feedback="success" onClick={() => handleClick('success')}>
                Success
              </Button>
              <Button feedback="error" onClick={() => handleClick('error')}>
                Error
              </Button>
              <Button loading={loading} onClick={handleLoading}>
                {loading ? 'Loading...' : 'Click to Load'}
              </Button>
              <Button disabled>Disabled</Button>
            </div>

            <Text variant="primary" weight="medium" className={ub("mt-4")}>Hover Effects:</Text>
            <div className={ub("flex gap-4 flex-wrap")}>
              <Button variant="primary">Hover me</Button>
              <Button variant="ghost">Hover me</Button>
              <Button variant="outline">Hover me</Button>
            </div>
          </div>
        </Card>

        {/* CARD TEST */}
        <Card variant="default" className={ub("mb-8")}>
          <Text variant="heading" size="xl" className={ub("mb-4")}>
            🃏 Card Test
          </Text>

          <div className={ub("grid grid-cols-3 gap-4")}>
            <Card variant="default" padding={4}>
              <Text weight="bold">Default Card</Text>
              <Text variant="muted" size="sm">With some content</Text>
            </Card>

            <Card variant="glass" padding={4}>
              <Text weight="bold">Glass Card</Text>
              <Text variant="muted" size="sm">Translucent background</Text>
            </Card>

            <Card variant="outline" padding={4}>
              <Text weight="bold">Outline Card</Text>
              <Text variant="muted" size="sm">Just border</Text>
            </Card>
          </div>
        </Card>

        {/* BADGE TEST */}
        <Card variant="default" className={ub("mb-8")}>
          <Text variant="heading" size="xl" className={ub("mb-4")}>
            🏷️ Badge Test
          </Text>

          <div className={ub("space-y-4")}>
            <div className={ub("flex gap-4 flex-wrap")}>
              <Badge variant="primary">Primary</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="error">Error</Badge>
              <Badge variant="neutral">Neutral</Badge>
            </div>

            <div className={ub("flex gap-4 flex-wrap")}>
              <Badge color="purple" shade={160}>Purple</Badge>
              <Badge color="pink" shade={160}>Pink</Badge>
              <Badge color="teal" shade={160}>Teal</Badge>
              <Badge color="amber" shade={160}>Amber</Badge>
            </div>

            <div className={ub("flex gap-4 items-center flex-wrap")}>
              <Badge size="sm">Small Badge</Badge>
              <Badge size="md">Medium Badge</Badge>
            </div>
          </div>
        </Card>

        {/* LINK TEST */}
        <Card variant="default" className={ub("mb-8")}>
          <Text variant="heading" size="xl" className={ub("mb-4")}>
            🔗 Link Test
          </Text>

          <div className={ub("space-y-4")}>
            <div className={ub("flex gap-6 flex-wrap")}>
              <Link href="#">Default Blue Link</Link>
              <Link color="green" shade={160} href="#">Green Link</Link>
              <Link color="purple" shade={180} hoverShade={220} href="#">Purple with hover</Link>
            </div>
            
            <div className={ub("p-4 bg-gray-20 rounded-2")}>
              <Text>Links in text: <Link href="#">click here</Link> and <Link href="#" underline={false}>no underline</Link></Text>
            </div>
          </div>
        </Card>

        {/* COLOR PALETTE TEST */}
        <Card variant="default" className={ub("mb-8")}>
          <Text variant="heading" size="xl" className={ub("mb-4")}>
            🎨 Color Palette Test (Auto Inversion)
          </Text>

          <ColorPalette
            colors={[
              { name: 'blue', shades: [100, 140, 180, 220] },
              { name: 'green', shades: [100, 140, 160, 200] },
              { name: 'red', shades: [100, 140, 160, 200] },
            ]}
          />

          <div className={ub("mt-6")}>
            <Text variant="primary" weight="medium" className={ub("mb-2")}>Single Color Grid:</Text>
            <ColorGrid 
              color="purple" 
              shades={[120, 160, 200, 240]} 
              title="Purple Scale"
            />
          </div>
        </Card>

        {/* AUTO INVERSION INFO */}
        <Card variant="glass" className={ub("mb-8")}>
          <div className={ub("flex items-start gap-4")}>
            <div className={ub("text-3xl")}>🎯</div>
            <div>
              <Text weight="bold" size="lg">Auto Inversion Test</Text>
              <Text variant="muted" className={ub("mt-1")}>
                सबै colored backgrounds मा text colors automatically invert भएको छ। 
                'default' Text variant ले parent को color inherit गर्छ। 
                'muted' variant मा opacity मात्र छ।
              </Text>
              <div className={ub("mt-4 p-4 bg-blue-180 rounded-2")}>
                <Text variant="default">This is on blue-180 (auto white text)</Text>
                <Text variant="muted">This is muted (70% opacity)</Text>
              </div>
              <div className={ub("mt-2 p-4 bg-gray-20 rounded-2")}>
                <Text variant="default">This is on gray-20 (auto dark text)</Text>
                <Text variant="muted">This is muted (70% opacity)</Text>
              </div>
            </div>
          </div>
        </Card>

        {/* FOOTER */}
        <div className={ub("text-center text-sm text-gray-150 mt-8")}>
          <Text variant="muted">
            Core Components v17.13.0 | Perfect Auto Inversion | No hardcoded colors
          </Text>
        </div>
      </div>
    </div>
  );
}

export default App;