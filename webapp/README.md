# RivannaAI Web Application

A beautiful, modern web interface for RivannaAI - your intelligent HPC cluster assistant.

## Features

### Dashboard
- Real-time cluster overview with key metrics
- CPU utilization trends with interactive charts
- Job distribution visualization
- Recent jobs table with live updates
- Beautiful dark theme with warm accent colors

### GPU Status Page
- Detailed node information with GPU availability
- Real-time status indicators
- Search and filter capabilities
- Visual CPU and memory usage bars
- Separate views for GPU and compute nodes

### AI Job Assistant
- Interactive chat interface powered by Claude AI
- Smart job optimization recommendations
- Wait time estimation
- Cluster status analysis
- Suggested prompts for common tasks

## Design

The application features a sleek dark theme inspired by modern developer tools:
- **Colors**: Deep black background (#0a0a0a) with warm orange accents (#e2b714)
- **Typography**: Inter for UI, JetBrains Mono for code
- **Animations**: Smooth transitions using Framer Motion
- **Responsive**: Works beautifully on all screen sizes

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Fast build tool
- **Tailwind CSS** - Utility-first styling
- **Framer Motion** - Smooth animations
- **Recharts** - Data visualization
- **React Router** - Navigation
- **Lucide React** - Beautiful icons

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Running HPC API server (FastAPI backend)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create environment file:
```bash
cp .env.example .env
```

3. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### Build for Production

```bash
npm run build
npm run preview
```

## Project Structure

```
webapp/
├── src/
│   ├── components/       # Reusable UI components
│   │   ├── Layout.tsx
│   │   ├── Sidebar.tsx
│   │   └── StatCard.tsx
│   ├── pages/           # Main application pages
│   │   ├── Dashboard.tsx
│   │   ├── GPUStatus.tsx
│   │   └── AIAssistant.tsx
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Helper functions and API client
│   ├── App.tsx          # Main app component
│   ├── main.tsx         # Entry point
│   └── index.css        # Global styles
├── public/              # Static assets
├── index.html           # HTML template
├── vite.config.ts       # Vite configuration
├── tailwind.config.js   # Tailwind configuration
└── tsconfig.json        # TypeScript configuration
```

## API Integration

The application connects to the FastAPI backend through a proxy configured in `vite.config.ts`. All API calls are prefixed with `/api` and automatically forwarded to `http://localhost:8000`.

### Available Endpoints

- `GET /api/nodes` - Fetch node information
- `GET /api/jobs` - Fetch job queue
- `GET /api/reasons` - Get wait reason explanations
- `POST /api/eta` - Estimate job wait time

## Customization

### Theme Colors

Edit `tailwind.config.js` to customize the color scheme:

```js
colors: {
  dark: {
    DEFAULT: '#0a0a0a',     // Background
    lighter: '#1a1a1a',     // Card background
    border: '#2a2a2a',      // Borders
  },
  accent: {
    DEFAULT: '#e2b714',     // Primary accent
    dark: '#c9a012',
    light: '#f5c518',
  },
}
```

### Fonts

The application uses:
- **Inter** for UI elements
- **JetBrains Mono** for code/monospace text

Change fonts in `index.html` and `tailwind.config.js`.

## Development

### Type Checking

```bash
npm run type-check
```

### Building

```bash
npm run build
```

## Performance

- Lazy loading for optimal bundle size
- Automatic data refresh every 12 seconds
- Optimized animations using Framer Motion
- Efficient chart rendering with Recharts

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## License

MIT
