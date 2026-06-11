# Highpoint Operations - Quincy Facility Management

An intelligent facility management system powered by a multi-agent AI architecture.

## Features

### 🤖 Multi-Agent AI System
- **Manager Agent**: Coordinates all agents and decomposes complex objectives
- **Compliance Agent**: Monitors regulations and generates audit reports
- **Operations Agent**: Manages maintenance, inventory, and scheduling
- **Training Agent**: Creates multi-modal training content and certifications
- **Critic Agent**: Evaluates outputs and ensures quality standards

### 🏢 Facility Management
- **Asset Lifecycle Management**: Track assets from purchase to disposal
- **Maintenance Scheduling**: Automated preventive and reactive maintenance
- **Work Order System**: AI-powered creation, assignment, and tracking
- **Inventory Control**: Automated monitoring and reordering
- **Compliance Tracking**: Regulatory monitoring and audit preparation

### 📚 Training & Learning
- **Multi-Modal Training**: In-person, online, video, and interactive formats
- **Role-Specific Content**: Tailored onboarding for all positions
- **Certification Management**: Track completions and expirations
- **Compliance Training**: Automatically updated for regulatory changes

### 📊 Analytics & Reporting
- **Real-Time Dashboards**: Monitor KPIs and system status
- **Agent Performance**: Track metrics and quality scores
- **Compliance Reports**: Automated generation for state audits
- **Event Logging**: Complete audit trail of all activities

## Quick Start

### Development
```bash
npm install
npm run dev
```

Visit http://localhost:9002/dashboard/multi-agent to access the AI agent dashboard.

### Key Pages
- `/dashboard` - Main dashboard
- `/dashboard/multi-agent` - Multi-agent system control panel
- `/dashboard/ai-chat` - AI assistant chat interface
- `/dashboard/maintenance` - Maintenance management
- `/dashboard/inventory` - Inventory tracking
- `/dashboard/tasks` - Task management
- `/dashboard/inspections` - Inspection scheduling
- `/dashboard/training` - Training modules (coming soon)

## Multi-Agent System Usage

### Process Complex Objectives
```typescript
import { processObjective } from '@/ai/multi-agent-api';

const result = await processObjective(
  "Prepare for state audit: generate compliance report, schedule inspections, and update training materials"
);
```

### Quick Actions
```typescript
// Auto-schedule preventive maintenance
await autoScheduleMaintenance();

// Monitor inventory and reorder
await monitorInventoryAndReorder();

// Generate compliance report
await generateComplianceReport('2024-01-01', '2024-03-31');

// Create training content
await generateTrainingContent('Housekeeper');
```

## Documentation

- [Multi-Agent System Guide](./docs/MULTI_AGENT_SYSTEM.md) - Complete documentation of the AI agent architecture

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **UI**: Tailwind CSS, Radix UI
- **Backend**: Firebase (Firestore, Auth)
- **AI**: Google Gemini via Genkit
- **Multi-Agent**: Custom orchestration system

## System Requirements

- Node.js 20+
- Firebase project configured
- Environment variables set in `.env.local`:
  - `NEXT_PUBLIC_FIREBASE_*` - Firebase configuration
  - `GOOGLE_GENAI_API_KEY` - Google AI API key

## Architecture Highlights

### Multi-Agent Coordination
- **Task Decomposition**: Manager breaks down complex objectives
- **Parallel Execution**: Agents work simultaneously when possible
- **Message Passing**: Structured communication via orchestrator
- **Quality Assurance**: Critic agent evaluates all outputs
- **Adaptive Learning**: Agents maintain memory and improve over time

### Scalability
- Handles unlimited facilities and assets
- Automated preventive maintenance scheduling
- Real-time inventory monitoring
- Continuous compliance monitoring
- Concurrent agent execution

## License

Proprietary - Highpoint Operations

## Support

For system issues or questions, please contact the development team.
