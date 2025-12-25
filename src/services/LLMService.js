// src/services/LLMService.js
import AsyncStorage from '@react-native-async-storage/async-storage';

class LLMService {
  constructor() {
    // Your free API key
    this.API_KEY = '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';
    
    // OpenRouter API configuration
    this.BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';
    
    // Try different free models in order of preference
    this.MODELS = [
      'google/gemma-2-9b-it:free',
      'microsoft/phi-3-medium-128k-instruct:free', 
      'huggingface/meta-llama/llama-3.1-8b-instruct:free',
      'openchat/openchat-7b:free',
      'gryphe/mythomist-7b:free'
    ];
    this.CURRENT_MODEL = this.MODELS[0]; // Start with first model
  }

  // Generate personalized workout using LLM
  async generatePersonalizedWorkout() {
    try {
      // Get user profile data
      const userProfile = await this.getUserProfile();
      const exerciseDatabase = await this.getExerciseDatabase();
      
      const prompt = this.createWorkoutPrompt(userProfile, exerciseDatabase);
      
      const response = await this.callLLM(prompt, 'workout_generation');
      
      // Parse and validate workout
      const workout = this.parseWorkoutResponse(response);
      
      return {
        success: true,
        workout: workout,
        generatedAt: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Workout Generation Error:', error);
      return {
        success: false,
        error: error.message,
        fallback: this.getFallbackWorkout()
      };
    }
  }

  // Answer user's fitness questions
  async askFitnessQuestion(userQuestion) {
    try {
      // Get user profile for personalized answers
      const userProfile = await this.getUserProfile();
      
      const prompt = this.createQuestionPrompt(userQuestion, userProfile);
      
      const response = await this.callLLM(prompt, 'question_answer');
      
      return {
        success: true,
        answer: response,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Question Answer Error:', error);
      return {
        success: false,
        error: error.message,
        fallback: "I'm sorry, I couldn't process your question right now. Please try again later."
      };
    }
  }

  // Core LLM API call with fallback models
  async callLLM(prompt, type = 'general') {
    let lastError = null;
    
    // Try each model until one works
    for (let i = 0; i < this.MODELS.length; i++) {
      const model = this.MODELS[i];
      
      try {
        console.log(`Trying model: ${model}`);
        
        const response = await fetch(this.BASE_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://gymapp.com',
            'X-Title': 'Gym Tracker App'
          },
          body: JSON.stringify({
            model: model,
            messages: [
              {
                role: 'system',
                content: this.getSystemPrompt(type)
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: type === 'workout_generation' ? 0.7 : 0.8,
            max_tokens: type === 'workout_generation' ? 1000 : 500
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          lastError = new Error(`Model ${model}: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
          console.log(`Model ${model} failed, trying next...`);
          continue;
        }

        const data = await response.json();
        const content = data.choices[0].message.content;
        
        // Success! Update current model for future use
        this.CURRENT_MODEL = model;
        console.log(`Success with model: ${model}`);
        return content;
        
      } catch (error) {
        lastError = error;
        console.log(`Model ${model} error:`, error.message);
        continue;
      }
    }
    
    // If all models failed, throw the last error
    throw lastError || new Error('All models failed');
  }

  // Get system prompts for different purposes
  getSystemPrompt(type) {
    const basePrompt = `You are an expert personal trainer and fitness coach. You have access to the user's profile and should provide personalized advice.`;
    
    switch (type) {
      case 'workout_generation':
        return `${basePrompt}

WORKOUT GENERATION RULES:
1. Create workouts based on user's fitness level, goals, and available equipment
2. Always include proper warm-up and cool-down suggestions
3. Provide sets, reps, and rest periods
4. Consider any injuries or limitations mentioned
5. Return response in this EXACT JSON format:

{
  "workoutName": "Upper Body Strength",
  "estimatedTime": "45 minutes",
  "difficulty": "intermediate",
  "exercises": [
    {
      "name": "Push-ups",
      "sets": 3,
      "reps": "10-12",
      "rest": "60 seconds",
      "notes": "Keep core tight, full range of motion",
      "primaryMuscles": ["chest", "triceps"],
      "secondaryMuscles": ["shoulders"],
      "equipment": ["bodyweight"],
      "category": "strength",
      "level": "intermediate",
      "instructions": ["Start in plank position", "Lower chest to ground", "Push back up"]
    }
  ],
  "warmup": "5-10 minutes light cardio",
  "cooldown": "5-10 minutes stretching"
}

IMPORTANT: Always include primaryMuscles as an array, even if just one muscle group.`;

      case 'question_answer':
        return `${basePrompt}

QUESTION ANSWERING RULES:
1. Provide personalized answers based on user's profile
2. Give practical, actionable advice
3. Be encouraging and motivational
4. If medical advice is needed, recommend consulting a healthcare professional
5. Keep responses concise but informative
6. Use the user's name if available`;

      default:
        return basePrompt;
    }
  }

  // Create workout generation prompt
  createWorkoutPrompt(userProfile, exerciseDatabase) {
    const availableExercises = exerciseDatabase.slice(0, 20).map(ex => 
      `${ex.name} (${ex.primaryMuscles?.join(', ') || 'Full body'}) - Equipment: ${ex.equipment?.join(', ') || 'Bodyweight'}`
    ).join('\n');

    return `Create a personalized workout for:

USER PROFILE:
- Name: ${userProfile.name || 'User'}
- Age: ${userProfile.age || 'Not specified'}
- Weight: ${userProfile.weight || 'Not specified'}kg
- Height: ${userProfile.height || 'Not specified'}cm
- Fitness Level: ${userProfile.fitnessLevel || 'beginner'}
- Primary Goal: ${userProfile.goal || 'general fitness'}
- Available Equipment: ${userProfile.equipment?.join(', ') || 'bodyweight only'}
- Workout Days per Week: ${userProfile.workoutDays || 3}
- Session Duration: ${userProfile.sessionTime || 45} minutes

AVAILABLE EXERCISES:
${availableExercises}

Please create a workout that matches their profile and goals. Focus on exercises from the available list but you can suggest alternatives if needed.`;
  }

  // Create question answering prompt
  createQuestionPrompt(question, userProfile) {
    return `User Question: "${question}"

USER CONTEXT:
- Name: ${userProfile.name || 'User'}
- Age: ${userProfile.age || 'Not specified'}
- Weight: ${userProfile.weight || 'Not specified'}kg
- Height: ${userProfile.height || 'Not specified'}cm
- Fitness Level: ${userProfile.fitnessLevel || 'beginner'}
- Goal: ${userProfile.goal || 'general fitness'}
- Equipment: ${userProfile.equipment?.join(', ') || 'limited'}

Please provide a personalized answer considering their profile and fitness level.`;
  }

  // Parse workout response from LLM
  parseWorkoutResponse(response) {
    try {
      // Try to parse as JSON first
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // If not JSON, create structured response from text
      return {
        workoutName: "AI Generated Workout",
        estimatedTime: "45 minutes",
        difficulty: "moderate",
        exercises: this.extractExercisesFromText(response),
        notes: response
      };
    } catch (error) {
      console.error('Parse error:', error);
      return this.getFallbackWorkout();
    }
  }

  // Extract exercises from text response
  extractExercisesFromText(text) {
    // Simple extraction - can be improved
    const lines = text.split('\n').filter(line => line.trim());
    const exercises = [];
    
    lines.forEach(line => {
      if (line.includes('sets') || line.includes('reps') || line.includes('x')) {
        exercises.push({
          name: line.split(':')[0]?.trim() || line.trim(),
          sets: 3,
          reps: "10-12",
          rest: "60 seconds",
          notes: line
        });
      }
    });
    
    return exercises.length > 0 ? exercises : this.getFallbackWorkout().exercises;
  }

  // Get user profile from AsyncStorage
  async getUserProfile() {
    try {
      const profile = await AsyncStorage.getItem('userProfile');
      return profile ? JSON.parse(profile) : {};
    } catch (error) {
      console.error('Error loading user profile:', error);
      return {};
    }
  }

  // Get exercise database
  async getExerciseDatabase() {
    try {
      // Try to load external database first
      const cachedExercises = await AsyncStorage.getItem('exercises_cache');
      if (cachedExercises) {
        return JSON.parse(cachedExercises).slice(0, 50); // Limit for prompt size
      }
      
      // Fallback to basic exercises
      return [
        { name: "Push-ups", primaryMuscles: ["chest", "triceps"], equipment: ["bodyweight"] },
        { name: "Squats", primaryMuscles: ["quadriceps", "glutes"], equipment: ["bodyweight"] },
        { name: "Pull-ups", primaryMuscles: ["back", "biceps"], equipment: ["pull-up bar"] },
        { name: "Planks", primaryMuscles: ["core"], equipment: ["bodyweight"] },
        { name: "Lunges", primaryMuscles: ["legs", "glutes"], equipment: ["bodyweight"] }
      ];
    } catch (error) {
      console.error('Error loading exercise database:', error);
      return [];
    }
  }

  // Fallback workout if LLM fails
  getFallbackWorkout() {
    return {
      workoutName: "Basic Full Body Workout",
      estimatedTime: "30 minutes",
      difficulty: "beginner",
      exercises: [
        {
          name: "Push-ups",
          sets: 3,
          reps: "8-12",
          rest: "60 seconds",
          notes: "Modify on knees if needed"
        },
        {
          name: "Squats",
          sets: 3,
          reps: "12-15",
          rest: "60 seconds",
          notes: "Keep chest up, knees behind toes"
        },
        {
          name: "Plank",
          sets: 3,
          reps: "30-60 seconds",
          rest: "60 seconds",
          notes: "Keep body straight, engage core"
        }
      ],
      warmup: "5 minutes light movement",
      cooldown: "5 minutes stretching"
    };
  }

  // Save workout history
  async saveWorkoutHistory(workout) {
    try {
      const history = await AsyncStorage.getItem('workoutHistory');
      const workouts = history ? JSON.parse(history) : [];
      
      workouts.unshift({
        ...workout,
        id: Date.now().toString(),
        createdAt: new Date().toISOString()
      });
      
      // Keep only last 50 workouts
      const limitedHistory = workouts.slice(0, 50);
      await AsyncStorage.setItem('workoutHistory', JSON.stringify(limitedHistory));
      
    } catch (error) {
      console.error('Error saving workout history:', error);
    }
  }

  // Save chat history
  async saveChatHistory(question, answer) {
    try {
      const history = await AsyncStorage.getItem('chatHistory');
      const chats = history ? JSON.parse(history) : [];
      
      chats.unshift({
        id: Date.now().toString(),
        question,
        answer,
        timestamp: new Date().toISOString()
      });
      
      // Keep only last 20 conversations
      const limitedHistory = chats.slice(0, 20);
      await AsyncStorage.setItem('chatHistory', JSON.stringify(limitedHistory));
      
    } catch (error) {
      console.error('Error saving chat history:', error);
    }
  }

  // Get chat history
  async getChatHistory() {
    try {
      const history = await AsyncStorage.getItem('chatHistory');
      return history ? JSON.parse(history) : [];
    } catch (error) {
      console.error('Error loading chat history:', error);
      return [];
    }
  }
}

export default new LLMService();