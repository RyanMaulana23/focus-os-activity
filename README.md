<<<<<<< HEAD
# Focus OS - Personal Productivity Dashboard

A modern, feature-rich productivity dashboard built with Next.js for students and professionals who want to boost their focus and productivity.

## 🎯 Features

### 1. **Task Manager**
- Create, manage, and track tasks
- Priority levels (Low, Medium, High) with color-coded badges
- Custom labels and tags
- Mark tasks as completed
- Quick status overview

### 2. **Pomodoro Timer**
- Customizable session durations (15, 25, 30 minutes)
- Real-time countdown display with visual progress
- Session tracking and history
- Start/Pause/Reset controls
- Daily session statistics

### 3. **Habit Tracker**
- Track weekly habits with 7-day view
- Streak counter (consecutive days)
- Visual habit completion indicators
- Quick habit addition with descriptions
- Weekly progress tracking

### 4. **Quick Stats Dashboard**
- Daily focus time summary
- Tasks completed counter
- Best habit streak display
- Total Pomodoro sessions today
- Real-time statistics updates

### 5. **Deep Work Mode**
- Toggle to minimize distractions
- Dark, focused interface
- Reduces visual noise
- Perfect for concentrated work sessions

### 6. **Notes & Materi** ⭐ NEW
- Upload catatan dalam format:
  - **PDF files** - Auto-extract text
  - **Word documents** (.doc, .docx) - Auto-extract text
  - **Text input** - Direct typing atau paste
- **Smart Ringkasan Generator**
  - Auto-generate ringkasan saat file dipilih
  - Algorithm-based summary menggunakan word frequency
  - Ekstrak poin-poin penting secara otomatis
  - Regenerate ringkasan kapan saja
  - Delete ringkasan yang sudah digenerate
- **Catatan Management**
  - Filter by kategori: Materi, Tugas, Ringkasan
  - Lihat detail catatan dengan expand
  - Delete catatan yang tidak perlu
  - Track file type & nama file
- **Sinkronisasi**
  - Ringkasan otomatis menyesuaikan dengan konten file
  - Simpan ringkasan sebagai catatan baru

## 🛠 Tech Stack

- **Framework**: Next.js 16 with App Router
- **Frontend**: React 19
- **Styling**: TailwindCSS 4
- **State Management**: Zustand with persistence
- **Date Handling**: date-fns
- **Icons**: Lucide React
- **Storage**: localStorage with Zustand middleware
- **PDF Processing**: pdfjs-dist
- **Word Processing**: mammoth

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Setup

1. **Clone and navigate to the project**
   ```bash
   cd vibe-coding-project
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   Navigate to `http://localhost:3000`

## 🚀 Getting Started

### Adding Tasks
1. Click the input field in the Task Manager
2. Enter task title
3. Select priority level
4. Add labels (comma-separated)
5. Click "Add" button

### Using Pomodoro Timer
1. Select session duration (15, 25, or 30 minutes)
2. Click "Start" to begin
3. Timer counts down automatically
4. Click "Pause" to pause the session
5. Click "Reset" to clear the timer

### Creating Habits
1. Enter habit name in the Habit Tracker
2. Add optional description
3. Click "Add Habit"
4. Click day numbers to mark completion
5. Watch your streak grow!

### Deep Work Mode
1. Click "Deep Work OFF" toggle in header
2. Interface switches to focused dark theme
3. Click indicator at bottom right to toggle back
4. Mode persists across sessions

## 📊 Project Structure

```
vibe-coding-project/
├── app/
│   ├── layout.tsx          # Root layout with metadata
│   ├── page.tsx            # Home page
│   ├── globals.css         # Global styles and deep work mode
│   └── api/                # API routes (future backend)
├── components/
│   ├── Dashboard.tsx       # Main dashboard layout
│   ├── TaskManager.tsx     # Task management component
│   ├── PomodoroTimer.tsx   # Pomodoro timer component
│   ├── HabitTracker.tsx    # Habit tracking component
│   ├── QuickStats.tsx      # Statistics display
│   └── DeepWorkToggle.tsx  # Deep work mode toggle
├── lib/
│   ├── types/
│   │   └── index.ts        # TypeScript type definitions
│   ├── stores/
│   │   ├── taskStore.ts    # Task state management
│   │   ├── pomodoroStore.ts # Pomodoro state management
│   │   ├── habitStore.ts   # Habit state management
│   │   └── uiStore.ts      # UI state management
│   └── utils/
│       └── format.ts       # Utility functions
└── public/                 # Static assets
```

## 🔄 State Management

### Zustand Stores

All state is managed globally using Zustand with automatic persistence:

- **useTaskStore**: Task creation, updates, deletion, and filtering
- **usePomodoroStore**: Timer state, sessions, and daily stats
- **useHabitStore**: Habit tracking, streaks, and weekly progress
- **useUIStore**: UI toggles (Deep Work mode)

All stores automatically persist data to localStorage.

## 💾 Data Persistence

- Tasks, habits, and Pomodoro sessions are automatically saved
- Data persists across browser sessions
- Uses browser's localStorage API via Zustand middleware
- No backend authentication required for MVP

## 🎨 Customization

### Colors and Themes
Modify `tailwind.config.ts` to customize:
- Primary colors
- Font families
- Border radius
- Spacing

### Timer Durations
Edit `components/PomodoroTimer.tsx` to add more duration options:
```tsx
{[15, 25, 30, 45].map((min) => (
  // duration buttons
))}
```

## 📱 Responsive Design

- Mobile-first approach
- Responsive grid layout
- Touch-friendly buttons
- Optimized for tablets and desktops

## 🔒 Privacy

- All data stored locally in browser
- No data sent to external servers (MVP)
- Complete privacy for sensitive information
- Clear data: Open DevTools → Application → Clear Storage

## 🐛 Troubleshooting

### Data Not Persisting?
- Check if localStorage is enabled in browser
- Clear browser cache and reload
- Check browser storage quota

### Timer Not Working?
- Verify browser tab is active
- Check for browser sleep settings
- Try resetting the timer

### Styles Not Applying?
- Run `npm run build` to verify no build errors
- Clear browser cache (Ctrl+Shift+Del)
- Restart dev server

## 🚀 Future Enhancements

- [ ] Backend API integration
- [ ] User authentication
- [ ] Data sync across devices
- [ ] Notifications and reminders
- [ ] Analytics and insights
- [ ] Export productivity reports
- [ ] Team collaboration features
- [ ] Mobile app (React Native)
- [ ] Voice commands for hands-free control
- [ ] AI-powered productivity insights

## 📝 License

This project is open source and available for personal and educational use.

## 🤝 Contributing

Feel free to fork this project and submit pull requests for any improvements!

## 💬 Support

For issues or suggestions, create an issue in the repository or reach out to the maintainers.

---

**Made with ❤️ for students and productivity enthusiasts**
=======
# focus-os-activity
website untuk daily aktivitas belajar agar fokus, belajar ala gen Z
>>>>>>> 831381d3a99f400dcfdd2e92c361c8f60522704b
