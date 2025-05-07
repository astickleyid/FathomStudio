import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import { storage } from "./storage";
import { openAIService } from "./openai-service";
import { aiSoundService } from "./ai-sound-service";
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
        } else if (data.type === 'track_action') {
          // Forward track actions for mobile gestures
          broadcastToClients(wss, {
            type: 'track_action',
            data: data.data
          });
          
          console.log(`Track action: ${data.data?.actionType} on track ${data.data?.trackId} (${data.data?.trackName})`);
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
    const OPEN = 1; // WebSocket ready state constant for OPEN
    server.clients.forEach((client) => {
      if (client.readyState === OPEN) {
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
  
  // Duplicate an existing track
  app.post('/api/tracks/:id/duplicate', async (req: Request, res: Response) => {
    try {
      const trackId = parseInt(req.params.id);
      
      // Get the original track
      const originalTrack = await storage.getTrackById(trackId);
      if (!originalTrack) {
        return res.status(404).json({ error: 'Track not found' });
      }
      
      // Create a new track with the same properties
      const duplicateData = {
        name: `${originalTrack.name} (Copy)`,
        projectId: originalTrack.projectId,
        type: originalTrack.type,
        color: originalTrack.color,
        isMuted: originalTrack.isMuted,
        isSoloed: originalTrack.isSoloed,
        isArmed: originalTrack.isArmed,
        isAI: originalTrack.isAI,
        volume: originalTrack.volume,
        pan: originalTrack.pan
      };
      
      const newTrack = await storage.createTrack(duplicateData);
      
      // If the original track had clips, duplicate those too
      const originalClips = await storage.getClipsByTrackId(trackId);
      if (originalClips && originalClips.length > 0) {
        for (const clip of originalClips) {
          await storage.createClip({
            trackId: newTrack.id,
            name: clip.name,
            startTime: clip.startTime,
            duration: clip.duration,
            audioData: clip.audioData,
            waveformData: JSON.stringify([])
          });
        }
      }
      
      // Broadcast track creation to connected clients
      broadcastToClients(wss, {
        type: 'track_created',
        data: newTrack
      });
      
      return res.status(201).json(newTrack);
    } catch (error) {
      console.error('Error duplicating track:', error);
      return res.status(500).json({ error: 'Failed to duplicate track' });
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
  
  // Unified AI Command Processing
  app.post('/api/ai/process-command', async (req: Request, res: Response) => {
    try {
      const { command, projectId, trackId } = req.body;
      
      if (!command) {
        return res.status(400).json({ error: 'Command is required' });
      }
      
      if (!projectId) {
        return res.status(400).json({ error: 'Project ID is required' });
      }
      
      // Get project details for context
      let projectDetails = null;
      let trackDetails = null;
      
      try {
        projectDetails = await storage.getProjectById(projectId);
        
        // If trackId is provided, get track details as well
        if (trackId) {
          trackDetails = await storage.getTrackById(trackId);
        }
      } catch (err) {
        console.error("Error fetching project/track details:", err);
        // Continue even if we can't get details - the AI can still work with minimal context
      }
      
      // Process the command with our unified AI assistant
      const aiResponse = await openAIService.processAICommand(
        command, 
        projectId, 
        projectDetails, 
        trackDetails
      );
      
      // Build the response
      const response = {
        type: aiResponse.intent,
        intent: aiResponse.intent,
        suggestion: aiResponse.suggestion,
        trackId: trackDetails?.id || null,
        action: aiResponse.action,
        parameters: aiResponse.parameters
      };
      
      // Notify connected clients about the AI response
      broadcastToClients(wss, {
        type: 'ai_response',
        command: command,
        response: response
      });
      
      return res.status(200).json(response);
    } catch (error) {
      console.error('Error processing AI command:', error);
      return res.status(500).json({ 
        error: 'Failed to process AI command', 
        suggestion: 'I encountered an error processing your request. Please try again.',
        type: 'error',
        intent: 'error'
      });
    }
  });
  
  // Get personalized welcome message for a project
  app.get('/api/projects/:projectId/welcome-message', async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      
      // Get project details
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      // Get number of tracks
      const tracks = await storage.getTracksByProjectId(projectId);
      const tracksCount = tracks.length;
      
      // Generate welcome message
      const message = await openAIService.generateWelcomeMessage(
        projectId,
        project.name,
        tracksCount
      );
      
      return res.status(200).json({ message });
    } catch (error) {
      console.error('Error generating welcome message:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // Autonomous Mix Bot Endpoints
  
  // Generate mix recommendations for a track
  app.post('/api/tracks/:trackId/generate-mix', async (req: Request, res: Response) => {
    try {
      const trackId = parseInt(req.params.trackId);
      const { projectId } = req.body;
      
      if (!projectId) {
        return res.status(400).json({ error: 'Project ID is required' });
      }
      
      // Generate mix recommendations using AI
      const recommendations = await openAIService.generateMixRecommendations(trackId, projectId);
      
      // Notify connected clients about the new mix recommendation
      broadcastToClients(wss, {
        type: 'mix_recommendation',
        trackId,
        recommendations
      });
      
      return res.status(200).json(recommendations);
    } catch (error) {
      console.error('Error generating mix recommendations:', error);
      return res.status(500).json({ error: 'Failed to generate mix recommendations' });
    }
  });
  
  // Apply mix recommendations to a track
  app.post('/api/tracks/:trackId/apply-mix', async (req: Request, res: Response) => {
    try {
      const trackId = parseInt(req.params.trackId);
      const { recommendation } = req.body;
      
      if (!recommendation) {
        return res.status(400).json({ error: 'Mix recommendation is required' });
      }
      
      // Apply the recommendation to the track
      const success = await openAIService.applyMixRecommendation(trackId, recommendation);
      
      if (success) {
        // Notify connected clients that the track has been updated with new mix settings
        const updatedTrack = await storage.getTrackById(trackId);
        
        if (updatedTrack) {
          broadcastToClients(wss, {
            type: 'track_updated',
            data: updatedTrack
          });
        }
        
        return res.status(200).json({ success: true, message: 'Mix applied successfully' });
      } else {
        return res.status(500).json({ error: 'Failed to apply mix' });
      }
    } catch (error) {
      console.error('Error applying mix:', error);
      return res.status(500).json({ error: 'Failed to apply mix' });
    }
  });
  
  // Auto-AI Mastering Templates Endpoints
  
  // Generate mastering preset for a specific platform
  app.post('/api/projects/:projectId/generate-mastering', async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const { targetPlatform } = req.body;
      
      if (!targetPlatform) {
        return res.status(400).json({ error: 'Target platform is required' });
      }
      
      // Get project details for context
      const projectDetails = await storage.getProjectById(projectId);
      if (!projectDetails) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      // Generate mastering preset using AI
      const preset = await openAIService.generateMasteringPreset(targetPlatform, projectId, projectDetails);
      
      // Notify connected clients about the new mastering preset
      broadcastToClients(wss, {
        type: 'mastering_preset_generated',
        projectId,
        preset
      });
      
      return res.status(200).json(preset);
    } catch (error) {
      console.error('Error generating mastering preset:', error);
      return res.status(500).json({ error: 'Failed to generate mastering preset' });
    }
  });
  
  // Apply mastering preset to a project
  app.post('/api/projects/:projectId/apply-mastering', async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const { preset } = req.body;
      
      if (!preset) {
        return res.status(400).json({ error: 'Mastering preset is required' });
      }
      
      // Apply the mastering preset to the project
      const success = await openAIService.applyMasteringPreset(projectId, preset);
      
      if (success) {
        // Notify connected clients that the project has been updated with new mastering settings
        broadcastToClients(wss, {
          type: 'project_mastering_updated',
          projectId,
          preset
        });
        
        return res.status(200).json({ success: true, message: 'Mastering preset applied successfully' });
      } else {
        return res.status(500).json({ error: 'Failed to apply mastering preset' });
      }
    } catch (error) {
      console.error('Error applying mastering preset:', error);
      return res.status(500).json({ error: 'Failed to apply mastering preset' });
    }
  });
  
  // AI Sound Generation API
  app.post('/api/ai/generate-sound', async (req: Request, res: Response) => {
    try {
      const { prompt, parameters, soundType, presetId, projectId } = req.body;
      
      // Validate input
      if (!parameters) {
        return res.status(400).json({ 
          error: 'Sound parameters are required'
        });
      }
      
      if (!soundType) {
        return res.status(400).json({ 
          error: 'Sound type is required'
        });
      }
      
      // If AI is enabled but no prompt provided, return error
      if (parameters.useAI && !prompt) {
        return res.status(400).json({ 
          error: 'A prompt is required when AI is enabled'
        });
      }
      
      // Generate the sound
      const result = await aiSoundService.generateSound(
        prompt || '', 
        parameters, 
        soundType, 
        presetId || 'default',
        projectId ? parseInt(projectId) : undefined
      );
      
      // Broadcast to connected clients
      broadcastToClients(wss, {
        type: 'sound_generated',
        data: {
          soundUrl: result.soundUrl,
          prompt,
          soundType,
          parameters
        }
      });
      
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error generating AI sound:', error);
      return res.status(500).json({ 
        error: 'Error generating AI sound', 
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Save generated sound to samples library
  app.post('/api/ai/save-sound', async (req: Request, res: Response) => {
    try {
      const { name, url, category, parameters, projectId } = req.body;
      
      if (!name || !url || !category) {
        return res.status(400).json({ 
          error: 'Name, URL, and category are required'
        });
      }
      
      // Save the sound to the samples library
      const sample = await aiSoundService.saveSound(
        name,
        url,
        category,
        true, // isAIGenerated
        JSON.stringify(parameters),
        projectId ? parseInt(projectId) : undefined
      );
      
      // Broadcast to connected clients
      broadcastToClients(wss, {
        type: 'sound_saved',
        data: sample
      });
      
      return res.status(201).json(sample);
    } catch (error) {
      console.error('Error saving AI sound:', error);
      return res.status(500).json({ 
        error: 'Error saving sound', 
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  return httpServer;
}
