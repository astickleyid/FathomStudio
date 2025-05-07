import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { z } from "zod";
import {
  trackInsertSchema,
  clipInsertSchema,
  projectInsertSchema,
  aiSuggestionInsertSchema,
  sampleInsertSchema,
  Track,
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Create a WebSocket server for real-time audio updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws) => {
    console.log('Client connected to WebSocket');
    
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Handle different message types
        if (data.type === 'ping') {
          // Respond to ping with a pong to keep the connection alive
          ws.send(JSON.stringify({ type: 'pong' }));
          console.log('Received ping, sent pong');
        } else if (data.type === 'track_update') {
          // Broadcast track updates to all clients
          broadcastToClients(wss, {
            type: 'track_update',
            data: data.data
          });
        } else if (data.type === 'transport_control') {
          // Broadcast transport control messages (play, stop, etc.)
          broadcastToClients(wss, {
            type: 'transport_control',
            action: data.action,
            position: data.position
          });
        } else if (data.type === 'ai_command') {
          // Forward AI commands to other clients
          broadcastToClients(wss, {
            type: 'ai_command',
            command: data.command,
            result: data.result
          });
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });
    
    ws.on('close', () => {
      console.log('Client disconnected from WebSocket');
    });
    
    // Send initial connection acknowledgment
    ws.send(JSON.stringify({ type: 'connected', message: 'Connected to Fathom Studio' }));
  });
  
  // Helper function to broadcast messages to all connected clients
  function broadcastToClients(server: WebSocketServer, data: any) {
    server.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  }
  
  // Projects API
  app.get('/api/projects', async (req: Request, res: Response) => {
    try {
      const projects = await storage.getAllProjects();
      return res.status(200).json(projects);
    } catch (error) {
      console.error('Error getting projects:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  app.get('/api/projects/:id', async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      return res.status(200).json(project);
    } catch (error) {
      console.error('Error getting project:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  app.post('/api/projects', async (req: Request, res: Response) => {
    try {
      const validatedData = projectInsertSchema.parse(req.body);
      const newProject = await storage.createProject(validatedData);
      return res.status(201).json(newProject);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error('Error creating project:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  app.put('/api/projects/:id', async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.id);
      const validatedData = projectInsertSchema.parse(req.body);
      const updatedProject = await storage.updateProject(projectId, validatedData);
      
      if (!updatedProject) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      return res.status(200).json(updatedProject);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error('Error updating project:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // Tracks API
  app.get('/api/projects/:projectId/tracks', async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const tracks = await storage.getTracksByProjectId(projectId);
      return res.status(200).json(tracks);
    } catch (error) {
      console.error('Error getting tracks:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  app.post('/api/projects/:projectId/tracks', async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const data = { ...req.body, projectId };
      const validatedData = trackInsertSchema.parse(data);
      const newTrack = await storage.createTrack(validatedData);
      
      // Notify connected clients about the new track
      broadcastToClients(wss, {
        type: 'track_created',
        data: newTrack
      });
      
      return res.status(201).json(newTrack);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error('Error creating track:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  app.put('/api/tracks/:id', async (req: Request, res: Response) => {
    try {
      const trackId = parseInt(req.params.id);
      const validatedData = trackInsertSchema.partial().parse(req.body);
      const updatedTrack = await storage.updateTrack(trackId, validatedData);
      
      if (!updatedTrack) {
        return res.status(404).json({ error: 'Track not found' });
      }
      
      // Notify connected clients about the track update
      broadcastToClients(wss, {
        type: 'track_updated',
        data: updatedTrack
      });
      
      return res.status(200).json(updatedTrack);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error('Error updating track:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // Clips API
  app.get('/api/tracks/:trackId/clips', async (req: Request, res: Response) => {
    try {
      const trackId = parseInt(req.params.trackId);
      const clips = await storage.getClipsByTrackId(trackId);
      return res.status(200).json(clips);
    } catch (error) {
      console.error('Error getting clips:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  app.post('/api/tracks/:trackId/clips', async (req: Request, res: Response) => {
    try {
      const trackId = parseInt(req.params.trackId);
      const data = { ...req.body, trackId };
      const validatedData = clipInsertSchema.parse(data);
      const newClip = await storage.createClip(validatedData);
      
      // Notify connected clients about the new clip
      broadcastToClients(wss, {
        type: 'clip_created',
        data: newClip
      });
      
      return res.status(201).json(newClip);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error('Error creating clip:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // AI Suggestions API
  app.get('/api/projects/:projectId/ai-suggestions', async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const suggestions = await storage.getAISuggestionsByProjectId(projectId);
      return res.status(200).json(suggestions);
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  app.post('/api/projects/:projectId/ai-suggestions', async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const data = { ...req.body, projectId };
      const validatedData = aiSuggestionInsertSchema.parse(data);
      const newSuggestion = await storage.createAISuggestion(validatedData);
      
      // Notify connected clients about the new AI suggestion
      broadcastToClients(wss, {
        type: 'ai_suggestion_created',
        data: newSuggestion
      });
      
      return res.status(201).json(newSuggestion);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error('Error creating AI suggestion:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // Sound Library API
  app.get('/api/samples', async (req: Request, res: Response) => {
    try {
      const category = req.query.category as string | undefined;
      const samples = await storage.getSamples(category);
      return res.status(200).json(samples);
    } catch (error) {
      console.error('Error getting samples:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  app.post('/api/samples', async (req: Request, res: Response) => {
    try {
      const validatedData = sampleInsertSchema.parse(req.body);
      const newSample = await storage.createSample(validatedData);
      return res.status(201).json(newSample);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error('Error creating sample:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // AI Command Processing
  app.post('/api/ai/process-command', async (req: Request, res: Response) => {
    try {
      const { command, projectId } = req.body;
      
      if (!command) {
        return res.status(400).json({ error: 'Command is required' });
      }
      
      // Process AI command (simplified mock implementation)
      // In a real system, this would connect to an AI processing service
      const response = processAICommand(command);
      
      // If it's related to a project, create an AI suggestion
      if (projectId) {
        const suggestionData = {
          botType: 'CommandBot',
          suggestion: response.suggestion,
          projectId: projectId,
          trackId: response.trackId,
        };
        
        const newSuggestion = await storage.createAISuggestion(suggestionData);
        
        // Notify connected clients about the new AI suggestion
        broadcastToClients(wss, {
          type: 'ai_suggestion_created',
          data: newSuggestion
        });
      }
      
      return res.status(200).json(response);
    } catch (error) {
      console.error('Error processing AI command:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // Helper function for processing AI commands (simplified)
  function processAICommand(command: string) {
    // For demo purposes - in a real app this would use a proper NLP system
    const lowerCommand = command.toLowerCase();
    
    if (lowerCommand.includes('add reverb')) {
      return {
        type: 'effect',
        action: 'add',
        effect: 'reverb',
        suggestion: 'I recommend adding a plate reverb with 1.2s decay time to enhance the spaciousness.',
        trackId: null
      };
    } else if (lowerCommand.includes('make bass')) {
      return {
        type: 'eq',
        action: 'adjust',
        parameter: 'bass',
        suggestion: 'Try boosting around 80Hz by +3dB with a wide Q to enhance the bass presence.',
        trackId: null
      };
    } else if (lowerCommand.includes('add compression')) {
      return {
        type: 'effect',
        action: 'add',
        effect: 'compression',
        suggestion: 'I suggest adding a compressor with 4:1 ratio, 5ms attack and 50ms release for more punch.',
        trackId: null
      };
    } else {
      return {
        type: 'info',
        suggestion: 'I\'m not sure how to process that request. Try asking about effects, EQ, or mixing.',
        trackId: null
      };
    }
  }
  
  return httpServer;
}
