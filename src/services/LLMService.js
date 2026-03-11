// src/services/LLMService.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from 'react-native-config';

class LLMService {
  constructor() {
    // Use environment variable for API key
    this.API_KEY = Config.GROQ_API_KEY || 'YOUR_GROQ_API_KEY_HERE';
    this.BASE_URL = 'https://api.groq.com/openai/v1/chat/completions';
    this.MODELS = [
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant'
    ];
    this.CURRENT_MODEL = this.MODELS[0];
  }

  // ─── WEEKLY PROGRAM GENERATION ───────────────────────────────────────────────

  /**
   * Generates a full weekly workout program based on user selections.
   * @param {Object} params
   * @param {string} params.goal        - e.g. 'bodybuilding', 'calisthenics', 'weight_loss', 'strength', 'general'
   * @param {number} params.daysPerWeek - 2 to 6
   * @param {string} params.splitType   - 'full_body' | 'upper_lower' | 'push_pull_legs' | 'bro_split'
   * @param {Object} params.userProfile - from AsyncStorage
   */
  async generateWeeklyProgram({ goal, daysPerWeek, splitType, userProfile }) {
    try {
      const exerciseDatabase = await this.getExerciseDatabase();
      const prompt = this.createWeeklyProgramPrompt({
        goal,
        daysPerWeek,
        splitType,
        userProfile,
        exerciseDatabase,
      });

      const response = await this.callLLM(prompt, 'weekly_program');
      const program = this.parseWeeklyProgramResponse(response);

      await this.saveWorkoutHistory({ type: 'weekly_program', program });

      return { success: true, program, generatedAt: new Date().toISOString() };
    } catch (error) {
      console.error('Weekly Program Generation Error:', error);
      return {
        success: false,
        error: error.message,
        fallback: this.getFallbackWeeklyProgram(daysPerWeek),
      };
    }
  }

  createWeeklyProgramPrompt({ goal, daysPerWeek, splitType, userProfile, exerciseDatabase }) {
    const GOAL_LABELS = {
      bodybuilding: 'Bodybuilding (muscle hypertrophy)',
      calisthenics: 'Calisthenics (bodyweight mastery)',
      weight_loss: 'Weight loss & conditioning',
      strength: 'Powerlifting / max strength',
      general: 'General fitness & health',
    };

    const SPLIT_LABELS = {
      full_body: 'Full Body (every session works all muscle groups)',
      upper_lower: 'Upper / Lower split',
      push_pull_legs: 'Push / Pull / Legs split',
      bro_split: 'Body-part split (chest day, back day, etc.)',
    };

    const sampleExercises = exerciseDatabase
      .slice(0, 30)
      .map(
        (ex) =>
          `${ex.name} — muscles: ${ex.primaryMuscles?.join(', ') || 'full body'} — equipment: ${ex.equipment?.join(', ') || 'bodyweight'}`
      )
      .join('\n');

    return `Create a ${daysPerWeek}-day weekly workout program.

USER PROFILE:
- Fitness level: ${userProfile?.fitnessLevel || 'intermediate'}
- Primary goal: ${GOAL_LABELS[goal] || goal}
- Split type: ${SPLIT_LABELS[splitType] || splitType}
- Training days per week: ${daysPerWeek}
- Available equipment: ${userProfile?.equipment?.join(', ') || 'gym (barbells, dumbbells, cables, machines)'}
- Session duration: ${userProfile?.sessionTime || 60} minutes

AVAILABLE EXERCISES (sample):
${sampleExercises}

RULES:
- Produce exactly ${daysPerWeek} training days, name them Day 1 … Day ${daysPerWeek}.
- Rest days should NOT appear as workout days.
- Each day must have a "dayName" (e.g. "Push Day", "Full Body A", "Chest & Triceps").
- Each day must have 4–7 exercises.
- For each exercise provide: name, sets (number), reps (string like "8-12" or "5"), rest ("60 seconds"), notes, primaryMuscles (array).
- Tailor volume/intensity to the goal: hypertrophy → 3-4 sets 8-12 reps; strength → 4-5 sets 3-6 reps; weight loss → higher reps + supersets.
- Add a warmup and cooldown note per day.

Respond ONLY with this exact JSON (no markdown, no extra text):

{
  "programName": "...",
  "goal": "${goal}",
  "splitType": "${splitType}",
  "daysPerWeek": ${daysPerWeek},
  "estimatedSessionTime": "60 minutes",
  "days": [
    {
      "dayNumber": 1,
      "dayName": "Push Day",
      "focus": "Chest, Shoulders, Triceps",
      "warmup": "5 min treadmill + arm circles",
      "cooldown": "5 min chest & shoulder stretch",
      "exercises": [
        {
          "name": "Barbell Bench Press",
          "sets": 4,
          "reps": "8-10",
          "rest": "90 seconds",
          "notes": "Control the eccentric, 2 sec down",
          "primaryMuscles": ["chest", "triceps", "shoulders"]
        }
      ]
    }
  ],
  "generalTips": "..."
}`;
  }

  parseWeeklyProgramResponse(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return this.getFallbackWeeklyProgram(3);
    } catch (error) {
      console.error('Weekly program parse error:', error);
      return this.getFallbackWeeklyProgram(3);
    }
  }

  getFallbackWeeklyProgram(daysPerWeek = 3) {
    const days = [];
    const dayTemplates = [
      {
        dayName: 'Full Body A',
        focus: 'Compound movements',
        exercises: [
          { name: 'Barbell Squat', sets: 4, reps: '8-10', rest: '90 seconds', notes: '', primaryMuscles: ['quadriceps', 'glutes'] },
          { name: 'Bench Press', sets: 4, reps: '8-10', rest: '90 seconds', notes: '', primaryMuscles: ['chest', 'triceps'] },
          { name: 'Bent-over Row', sets: 4, reps: '8-10', rest: '90 seconds', notes: '', primaryMuscles: ['back', 'biceps'] },
        ],
      },
      {
        dayName: 'Full Body B',
        focus: 'Accessory work',
        exercises: [
          { name: 'Romanian Deadlift', sets: 3, reps: '10-12', rest: '75 seconds', notes: '', primaryMuscles: ['hamstrings', 'glutes'] },
          { name: 'Overhead Press', sets: 3, reps: '10-12', rest: '75 seconds', notes: '', primaryMuscles: ['shoulders', 'triceps'] },
          { name: 'Pull-ups', sets: 3, reps: '8-10', rest: '75 seconds', notes: '', primaryMuscles: ['back', 'biceps'] },
        ],
      },
      {
        dayName: 'Full Body C',
        focus: 'Volume',
        exercises: [
          { name: 'Lunges', sets: 3, reps: '12 each', rest: '60 seconds', notes: '', primaryMuscles: ['quadriceps', 'glutes'] },
          { name: 'Dumbbell Press', sets: 3, reps: '12-15', rest: '60 seconds', notes: '', primaryMuscles: ['chest', 'shoulders'] },
          { name: 'Cable Row', sets: 3, reps: '12-15', rest: '60 seconds', notes: '', primaryMuscles: ['back', 'biceps'] },
        ],
      },
    ];

    for (let i = 0; i < Math.min(daysPerWeek, 3); i++) {
      days.push({
        dayNumber: i + 1,
        dayName: dayTemplates[i].dayName,
        focus: dayTemplates[i].focus,
        warmup: '5-10 min light cardio + dynamic stretches',
        cooldown: '5 min static stretching',
        exercises: dayTemplates[i].exercises,
      });
    }

    return {
      programName: 'Basic Full Body Program',
      goal: 'general',
      splitType: 'full_body',
      daysPerWeek,
      estimatedSessionTime: '45 minutes',
      days,
      generalTips: 'Rest at least one day between sessions. Stay hydrated.',
    };
  }

  // ─── SINGLE WORKOUT GENERATION (unchanged) ────────────────────────────────

  async generatePersonalizedWorkout() {
    try {
      const userProfile = await this.getUserProfile();
      const exerciseDatabase = await this.getExerciseDatabase();
      const prompt = this.createWorkoutPrompt(userProfile, exerciseDatabase);
      const response = await this.callLLM(prompt, 'workout_generation');
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

  async askFitnessQuestion(userQuestion) {
    try {
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

  // ─── CORE LLM CALL ───────────────────────────────────────────────────────────

  async callLLM(prompt, type = 'general') {
    let lastError = null;

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
            'X-Title': 'GymApp'
          },
          body: JSON.stringify({
            model: model,
            messages: [
              { role: 'system', content: this.getSystemPrompt(type) },
              { role: 'user', content: prompt }
            ],
            temperature: type === 'weekly_program' ? 0.6 : type === 'workout_generation' ? 0.7 : 0.8,
            max_tokens: type === 'weekly_program' ? 2500 : type === 'workout_generation' ? 1000 : 500
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

        this.CURRENT_MODEL = model;
        console.log(`Success with model: ${model}`);
        return content;

      } catch (error) {
        lastError = error;
        console.log(`Model ${model} error:`, error.message);
        continue;
      }
    }

    throw lastError || new Error('All models failed');
  }

  getSystemPrompt(type) {
    const basePrompt = `You are an expert personal trainer and fitness coach with 15 years of experience. Provide precise, science-backed, personalized fitness programming.`;

    switch (type) {
      case 'weekly_program':
        return `${basePrompt}

You specialize in creating structured weekly workout programs. Always respond with valid JSON only — no markdown fences, no extra commentary before or after the JSON object. The JSON must exactly match the schema provided.`;

      case 'workout_generation':
        return `${basePrompt}

WORKOUT GENERATION RULES:
1. Create workouts based on user's fitness level, goals, and available equipment
2. Always include proper warm-up and cool-down suggestions
3. Provide sets, reps, and rest periods
4. Return response in this EXACT JSON format:

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

  // ─── PROMPTS ─────────────────────────────────────────────────────────────────

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

Please create a workout that matches their profile and goals.`;
  }

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

  // ─── PARSERS ─────────────────────────────────────────────────────────────────

  parseWorkoutResponse(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

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

  extractExercisesFromText(text) {
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

  // ─── STORAGE ──────────────────────────────────────────────────────────────────

  async getUserProfile() {
    try {
      const profile = await AsyncStorage.getItem('userProfile');
      return profile ? JSON.parse(profile) : {};
    } catch (error) {
      console.error('Error loading user profile:', error);
      return {};
    }
  }

  async getExerciseDatabase() {
    try {
      const cachedExercises = await AsyncStorage.getItem('exercises_cache');
      if (cachedExercises) {
        return JSON.parse(cachedExercises).slice(0, 50);
      }

      return [
        { name: "Push-ups", primaryMuscles: ["chest", "triceps"], equipment: ["bodyweight"] },
        { name: "Squats", primaryMuscles: ["quadriceps", "glutes"], equipment: ["bodyweight"] },
        { name: "Pull-ups", primaryMuscles: ["back", "biceps"], equipment: ["pull-up bar"] },
        { name: "Planks", primaryMuscles: ["core"], equipment: ["bodyweight"] },
        { name: "Lunges", primaryMuscles: ["legs", "glutes"], equipment: ["bodyweight"] },
        { name: "Barbell Bench Press", primaryMuscles: ["chest", "triceps"], equipment: ["barbell"] },
        { name: "Deadlift", primaryMuscles: ["back", "hamstrings", "glutes"], equipment: ["barbell"] },
        { name: "Overhead Press", primaryMuscles: ["shoulders", "triceps"], equipment: ["barbell"] },
        { name: "Dumbbell Row", primaryMuscles: ["back", "biceps"], equipment: ["dumbbell"] },
        { name: "Romanian Deadlift", primaryMuscles: ["hamstrings", "glutes"], equipment: ["barbell"] },
      ];
    } catch (error) {
      console.error('Error loading exercise database:', error);
      return [];
    }
  }

  getFallbackWorkout() {
    return {
      workoutName: "Basic Full Body Workout",
      estimatedTime: "30 minutes",
      difficulty: "beginner",
      exercises: [
        { name: "Push-ups", sets: 3, reps: "8-12", rest: "60 seconds", notes: "Modify on knees if needed" },
        { name: "Squats", sets: 3, reps: "12-15", rest: "60 seconds", notes: "Keep chest up, knees behind toes" },
        { name: "Plank", sets: 3, reps: "30-60 seconds", rest: "60 seconds", notes: "Keep body straight, engage core" }
      ],
      warmup: "5 minutes light movement",
      cooldown: "5 minutes stretching"
    };
  }

  async saveWorkoutHistory(workout) {
    try {
      const history = await AsyncStorage.getItem('workoutHistory');
      const workouts = history ? JSON.parse(history) : [];

      workouts.unshift({
        ...workout,
        id: Date.now().toString(),
        createdAt: new Date().toISOString()
      });

      const limitedHistory = workouts.slice(0, 50);
      await AsyncStorage.setItem('workoutHistory', JSON.stringify(limitedHistory));
    } catch (error) {
      console.error('Error saving workout history:', error);
    }
  }

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

      const limitedHistory = chats.slice(0, 20);
      await AsyncStorage.setItem('chatHistory', JSON.stringify(limitedHistory));
    } catch (error) {
      console.error('Error saving chat history:', error);
    }
  }

  async getChatHistory() {
    try {
      const history = await AsyncStorage.getItem('chatHistory');
      return history ? JSON.parse(history) : [];
    } catch (error) {
      console.error('Error loading chat history:', error);
      return [];
    }
  }

  async testAPI() {
    try {
      console.log('Testing API connectivity...');
      const response = await this.callLLM('Say "API Connected!" in exactly 3 words.', 'general');
      console.log('API Test Result:', response);
      return { success: true, message: response };
    } catch (error) {
      console.error('API Test Failed:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new LLMService();