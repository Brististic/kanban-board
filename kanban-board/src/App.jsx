import { useState, useEffect } from 'react';
import { Container, Typography, Box, Paper, Card, CardContent, Button, Chip, GlobalStyles, TextField } from '@mui/material';
import { DndContext } from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';

const columns = ['To Do', 'In Progress', 'Done'];
const apiHost = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const apiOrigin = /^https?:\/\//i.test(apiHost) ? apiHost : `https://${apiHost}`;
const BACKEND_URL = `${apiOrigin.replace(/\/+$/, '')}/api/tasks`;

const getColumnStyle = (title) => {
  switch (title) {
    case 'To Do': return { neon: '#00f2ff', bg: '#001a1c' };
    case 'In Progress': return { neon: '#bf00ff', bg: '#1a0029' };
    case 'Done': return { neon: '#39ff14', bg: '#051c00' };
    default: return { neon: '#ffffff', bg: '#1a1a1a' };
  }
};

// --- 1. THE DRAGGABLE CARD COMPONENT ---
function DraggableTask({ task, onDelete }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: task.id });
  
  const style = transform ? { 
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  const colStyle = getColumnStyle(task.status);

  return (
    <Card 
      ref={setNodeRef} 
      style={style} 
      {...listeners} 
      {...attributes} 
      sx={{ 
        marginBottom: 2.5, 
        cursor: 'grab', 
        zIndex: 100, 
        position: 'relative',
        borderRadius: '4px',
        backgroundColor: '#1a1a1a',
        border: `2px solid ${colStyle.neon}`,
        boxShadow: `4px 4px 0px ${colStyle.neon}44`,
        transition: 'all 0.15s ease-in-out',
        '&:hover': {
          transform: 'translateY(-3px) translateX(-2px)',
          boxShadow: `8px 8px 0px ${colStyle.neon}aa`,
          backgroundColor: '#252525',
        },
        '&:active': { cursor: 'grabbing' }
      }}
    >
      <CardContent sx={{ padding: '16px !important', display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption" sx={{ fontWeight: 800, color: '#666', letterSpacing: '1px', textTransform: 'uppercase' }}>
            ID::{task.id}
          </Typography>
          
          {/* FIX: Combined propagation stop and delete execution directly onto onMouseDown */}
          <Button 
            variant="text" 
            size="small"
            onMouseDown={(e) => {
              e.stopPropagation(); // Blocks dnd-kit intercept
              onDelete(task.id);   // Erases from state/DB instantly
            }}
            sx={{ 
              minWidth: 'auto', 
              padding: '0px 6px', 
              textTransform: 'uppercase',
              borderRadius: '2px',
              fontSize: '0.7rem',
              fontWeight: 700,
              color: '#ff4444',
              border: '1px solid transparent',
              '&:hover': { backgroundColor: '#ff444422', border: '1px solid #ff4444' }
            }}
          >
            [Delete]
          </Button>
        </Box>

        <Typography variant="body1" sx={{ fontWeight: 600, color: '#ffffff', lineHeight: 1.3, fontSize: '1.05rem' }}>
          {task.title}
        </Typography>
      </CardContent>
    </Card>
  );
}

// --- 2. THE DROPPABLE COLUMN COMPONENT ---
function DroppableColumn({ title, tasks, onDelete }) {
  const { setNodeRef } = useDroppable({ id: title });
  const colStyle = getColumnStyle(title);

  return (
    <Paper 
      ref={setNodeRef} 
      elevation={0} 
      sx={{ 
        flex: 1, 
        padding: 3, 
        backgroundColor: '#0a0a0a',
        border: '1px solid #222',
        minHeight: '550px', 
        borderRadius: '8px', 
        display: 'flex', 
        flexDirection: 'column',
        position: 'relative',
        backgroundImage: 'linear-gradient(#111 1px, transparent 1px), linear-gradient(90deg, #111 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4, pb: 1, borderBottom: '2px solid #222' }}>
        <Typography variant="h6" sx={{ fontWeight: 900, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '1px' }}>
          {title}
        </Typography>
        <Chip 
          label={tasks.length} 
          size="small" 
          sx={{ 
            backgroundColor: colStyle.bg, 
            color: colStyle.neon, 
            fontWeight: 800,
            fontSize: '0.8rem',
            borderRadius: '4px',
            border: `1px solid ${colStyle.neon}`,
            boxShadow: `0 0 10px ${colStyle.neon}aa`
          }} 
        />
      </Box>

      <Box sx={{ flexGrow: 1 }}>
        {tasks.map((task) => (
          <DraggableTask key={task.id} task={task} onDelete={onDelete} />
        ))}
      </Box>
    </Paper>
  );
}

// --- 3. THE MAIN APP ---
function App() {
  const [tasks, setTasks] = useState([]);
  const [listening, setListening] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  // FETCH ALL TASKS ON TARGET MOUNT
  useEffect(() => {
    fetch(BACKEND_URL)
      .then((res) => res.json())
      .then((data) => setTasks(data))
      .catch((err) => console.error('Error fetching database records:', err));
  }, []);

  // HANDLER TO CREATE A NEW TASK
  const handleAddTask = (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    fetch(BACKEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTaskTitle })
    })
      .then((res) => res.json())
      .then((newTask) => {
        setTasks((prev) => [...prev, newTask]);
        setNewTaskTitle('');
      })
      .catch((err) => console.error('Error adding task:', err));
  };

  // SYNCHRONIZE DRAG END TRANSACTION
  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id;
    const newStatus = over.id;

    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: newStatus } : t));

    fetch(`${BACKEND_URL}/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    }).catch((err) => console.error('SQL Update Error:', err));
  };

  // SYNCHRONIZE DELETE OPERATION
  const handleDeleteTask = (id) => {
    setTasks((prev) => prev.filter((task) => task.id !== id));

    fetch(`${BACKEND_URL}/${id}`, {
      method: 'DELETE'
    }).catch((err) => console.error('SQL Delete Error:', err));
  };

  // SYNCHRONIZE SPEECH API SYSTEM TRIGGER
  const updateTaskStatusViaVoice = (taskId, newStatus) => {
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: newStatus } : t));

    fetch(`${BACKEND_URL}/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    }).catch((err) => console.error('Voice SQL Update Error:', err));
  };

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Browser doesn't support Speech API. Use Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();
    setListening(true);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.toLowerCase();
      console.log("System decoded voice:", transcript);
      
      let targetStatus = null;
      if (transcript.includes('to do')) targetStatus = 'To Do';
      else if (transcript.includes('in progress')) targetStatus = 'In Progress';
      else if (transcript.includes('done')) targetStatus = 'Done';

      let targetTaskId = null;
      if (transcript.includes('1') || transcript.includes('one')) targetTaskId = '1';
      else if (transcript.includes('2') || transcript.includes('two')) targetTaskId = '2';
      else if (transcript.includes('3') || transcript.includes('three')) targetTaskId = '3';
      else if (transcript.includes('4') || transcript.includes('four')) targetTaskId = '4';

      if (targetStatus && targetTaskId) {
        updateTaskStatusViaVoice(targetTaskId, targetStatus);
      } else {
        alert(`Command Unrecognized: "${transcript}". Try "Move task one to done."`);
      }
      setListening(false);
    };

    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognition.start();
  };

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#000000', color: '#ffffff', pt: 6, pb: 8 }}>
      <GlobalStyles styles={{ body: { backgroundColor: '#000000', margin: 0, fontFamily: 'Rajdhani, sans-serif' } }} />
      
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 6 }}>
          <Typography variant="h3" sx={{ fontWeight: 900, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '-1px', fontStyle: 'italic' }}>
           PLACARDS 
          </Typography>

          <Button 
            variant="contained" 
            onClick={startListening}
            sx={{ 
              backgroundColor: listening ? '#ff0055' : '#1a1a1a',
              color: '#ffffff',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '1px',
              padding: '12px 30px',
              borderRadius: '4px',
              border: `2px solid ${listening ? '#ff0055' : '#ffffff'}`,
              boxShadow: listening ? '0 0 20px #ff0055, inset 0 0 10px #ff0055' : '4px 4px 0px #ffffff44',
              transition: 'all 0.2s ease-in-out',
              mb: 4,
              '&:hover': {
                backgroundColor: listening ? '#ff0055' : '#ffffff',
                color: listening ? '#ffffff' : '#000000',
                boxShadow: listening ? '0 0 30px #ff0055' : '0 0 15px #ffffffaa',
              }
            }}
          >
            {listening ? ">>> LISTENING <<<" : "🎤 Execute Voice Command"}
          </Button>

          <Box 
            component="form" 
            onSubmit={handleAddTask} 
            sx={{ display: 'flex', gap: 2, justifyContent: 'center', width: '100%', maxWidth: '500px' }}
          >
            <TextField
              variant="outlined"
              placeholder="Add new objective..."
              size="small"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              sx={{
                flexGrow: 1,
                input: { color: '#ffffff', fontWeight: 600 },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '#333333', borderRadius: '4px' },
                  '&:hover fieldset': { borderColor: '#00f2ff' },
                  '&.Mui-focused fieldset': { borderColor: '#00f2ff', boxShadow: '0 0 10px #00f2ffaa' },
                }
              }}
            />
            <Button
              type="submit"
              variant="contained"
              sx={{
                backgroundColor: '#00f2ff',
                color: '#000000',
                fontWeight: 800,
                borderRadius: '4px',
                padding: '0 24px',
                '&:hover': { backgroundColor: '#00c8ff', boxShadow: '0 0 15px #00f2ff' }
              }}
            >
              + ADD
            </Button>
          </Box>
        </Box>
        
        <DndContext onDragEnd={handleDragEnd}>
          <Box sx={{ display: 'flex', gap: 4, marginTop: 2, alignItems: 'flex-start' }}>
            {columns.map((columnTitle) => {
              const columnTasks = tasks.filter((task) => task.status === columnTitle);
              return (
                <DroppableColumn 
                  key={columnTitle} 
                  title={columnTitle} 
                  tasks={columnTasks} 
                  onDelete={handleDeleteTask}
                />
              );
            })}
          </Box>
        </DndContext>
      </Container>
    </Box>
  );
}

export default App;