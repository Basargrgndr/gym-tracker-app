import ExerciseAPI from './ExerciseAPI';

const WorkoutService = {
  // Generate workout using external exercise database
  generateWorkout: async function(userProfile) {
    try {
      // Get filtered exercises from the external API
      const availableExercises = await ExerciseAPI.getExercisesForWorkout(userProfile);
      
      if (!availableExercises || availableExercises.length === 0) {
        throw new Error('No exercises available for your preferences');
      }
      
      console.log(`Found ${availableExercises.length} available exercises`);
      
      let selectedExercises = [];
      
      // Select exercises based on goals and workout duration
      selectedExercises = await WorkoutService.selectExercisesByGoals(
        availableExercises, 
        userProfile.goals, 
        userProfile.workoutDuration,
        userProfile.fitnessLevel
      );
      
      // Ensure we have enough exercises
      const targetCount = WorkoutService.getTargetExerciseCount(userProfile.workoutDuration);
      
      if (selectedExercises.length < targetCount) {
        // Fill remaining slots with variety
        const remainingExercises = availableExercises.filter(ex => 
          !selectedExercises.find(sel => sel.id === ex.id)
        );
        
        // Shuffle and add remaining exercises
        const shuffled = WorkoutService.shuffleArray(remainingExercises);
        const needed = targetCount - selectedExercises.length;
        selectedExercises.push(...shuffled.slice(0, needed));
      }
      
      // Limit to target count
      selectedExercises = selectedExercises.slice(0, targetCount);
      
      // Add sets, reps, and rest based on fitness level and goals
      const workoutExercises = selectedExercises.map(exercise => 
        WorkoutService.addWorkoutParameters(exercise, userProfile.fitnessLevel, userProfile.goals)
      );
      
      const estimatedTime = WorkoutService.calculateEstimatedTime(workoutExercises, userProfile.workoutDuration);
      
      return {
        exercises: workoutExercises,
        estimatedTime,
        difficulty: userProfile.fitnessLevel,
        focus: userProfile.goals.join(', '),
        totalExercises: workoutExercises.length,
        date: new Date().toDateString(),
        generatedBy: 'ExternalDB'
      };
      
    } catch (error) {
      console.error('Error generating workout:', error);
      // Fallback to local generation
      return WorkoutService.generateFallbackWorkout(userProfile);
    }
  },

  // Select exercises based on user goals
  selectExercisesByGoals: async function(availableExercises, goals, workoutDuration, fitnessLevel) {
    let selectedExercises = [];
    
    // Categorize exercises
    const strengthExercises = availableExercises.filter(ex => 
      ex.category === 'strength' && ex.mechanic === 'compound'
    );
    const cardioExercises = availableExercises.filter(ex => 
      ex.category === 'cardio' || ex.category === 'plyometrics'
    );
    const isolationExercises = availableExercises.filter(ex => 
      ex.category === 'strength' && ex.mechanic === 'isolation'
    );
    const coreExercises = availableExercises.filter(ex => 
      ex.primaryMuscles.some(muscle => muscle.toLowerCase().includes('core') || 
                                     muscle.toLowerCase().includes('abdominal'))
    );

    // Select based on goals
    if (goals.includes('strength')) {
      // Prioritize compound movements
      const compoundMoves = WorkoutService.shuffleArray(strengthExercises).slice(0, 3);
      selectedExercises.push(...compoundMoves);
    }
    
    if (goals.includes('cardio')) {
      // Add cardio exercises
      const cardioMoves = WorkoutService.shuffleArray(cardioExercises).slice(0, 2);
      selectedExercises.push(...cardioMoves);
    }
    
    if (goals.includes('muscle building')) {
      // Mix compound and isolation
      const compoundMoves = WorkoutService.shuffleArray(strengthExercises).slice(0, 2);
      const isolationMoves = WorkoutService.shuffleArray(isolationExercises).slice(0, 2);
      selectedExercises.push(...compoundMoves, ...isolationMoves);
    }
    
    if (goals.includes('weight loss')) {
      // Focus on high-energy compound movements
      const highEnergyMoves = WorkoutService.shuffleArray([
        ...strengthExercises,
        ...cardioExercises
      ]).slice(0, 3);
      selectedExercises.push(...highEnergyMoves);
    }
    
    // Always include at least one core exercise
    if (coreExercises.length > 0) {
      const coreMove = WorkoutService.shuffleArray(coreExercises)[0];
      selectedExercises.push(coreMove);
    }
    
    // Remove duplicates
    selectedExercises = selectedExercises.filter((exercise, index, self) => 
      index === self.findIndex(ex => ex.id === exercise.id)
    );
    
    return selectedExercises;
  },

  // Add workout parameters (sets, reps, rest) to exercises
  addWorkoutParameters: function(exercise, fitnessLevel, goals) {
    let sets, reps, rest;
    
    // Handle different exercise types
    if (exercise.category === 'cardio' || exercise.category === 'plyometrics') {
      sets = fitnessLevel === 'beginner' ? 2 : fitnessLevel === 'intermediate' ? 3 : 4;
      reps = fitnessLevel === 'beginner' ? '20-30 seconds' : '30-45 seconds';
      rest = '30-60 seconds';
    } else if (exercise.force === 'static' || exercise.mechanic === 'isometric') {
      sets = 3;
      reps = fitnessLevel === 'beginner' ? '20-30 seconds' : 
             fitnessLevel === 'intermediate' ? '30-45 seconds' : '45-60 seconds';
      rest = '30-60 seconds';
    } else {
      // Strength exercises
      if (goals.includes('strength')) {
        sets = fitnessLevel === 'beginner' ? 3 : fitnessLevel === 'intermediate' ? 4 : 5;
        reps = fitnessLevel === 'beginner' ? '5-8' : fitnessLevel === 'intermediate' ? '6-8' : '4-6';
        rest = '90-120 seconds';
      } else if (goals.includes('muscle building')) {
        sets = fitnessLevel === 'beginner' ? 3 : 4;
        reps = fitnessLevel === 'beginner' ? '8-12' : '10-15';
        rest = '60-90 seconds';
      } else {
        // General fitness
        sets = fitnessLevel === 'beginner' ? 2 : 3;
        reps = fitnessLevel === 'beginner' ? '8-12' : '12-15';
        rest = '45-60 seconds';
      }
    }

    return {
      ...exercise,
      sets,
      reps,
      rest
    };
  },

  // Get target number of exercises based on workout duration
  getTargetExerciseCount: function(workoutDuration) {
    switch (workoutDuration) {
      case 'short':
        return 4;
      case 'medium':
        return 6;
      case 'long':
        return 8;
      default:
        return 6;
    }
  },

  // Calculate estimated workout time
  calculateEstimatedTime: function(exercises, workoutDuration) {
    // Base calculation on number of sets and rest periods
    let totalSets = exercises.reduce((sum, exercise) => sum + exercise.sets, 0);
    let avgRestTime = 60; // Average rest time in seconds
    let avgSetTime = 45; // Average time per set in seconds
    
    let totalTimeMinutes = ((totalSets * avgSetTime) + (totalSets * avgRestTime)) / 60;
    
    // Round to nearest 5 minutes and add buffer
    totalTimeMinutes = Math.ceil(totalTimeMinutes / 5) * 5 + 5;
    
    // Ensure it matches expected duration ranges
    if (workoutDuration === 'short') {
      totalTimeMinutes = Math.min(totalTimeMinutes, 25);
    } else if (workoutDuration === 'medium') {
      totalTimeMinutes = Math.min(Math.max(totalTimeMinutes, 25), 45);
    } else {
      totalTimeMinutes = Math.max(totalTimeMinutes, 40);
    }
    
    return `${totalTimeMinutes} minutes`;
  },

  // Utility function to shuffle array
  shuffleArray: function(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  },

  // Fallback workout generation if external API fails
  generateFallbackWorkout: function(userProfile) {
    console.log('Using fallback workout generation');
    
    const fallbackExercises = [
      {
        id: 'push_ups_fallback',
        name: 'Push-ups',
        category: 'strength',
        level: 'beginner',
        mechanic: 'compound',
        equipment: 'body only',
        force: 'push',
        primaryMuscles: ['chest', 'triceps'],
        secondaryMuscles: ['shoulders'],
        instructions: [
          'Start in a plank position with hands under shoulders',
          'Lower your body until chest nearly touches the floor',
          'Push back up to starting position',
          'Keep your body in a straight line throughout'
        ]
      },
      {
        id: 'squats_fallback',
        name: 'Squats',
        category: 'strength',
        level: 'beginner',
        mechanic: 'compound',
        equipment: 'body only',
        force: 'push',
        primaryMuscles: ['quadriceps', 'glutes'],
        secondaryMuscles: ['hamstrings', 'calves'],
        instructions: [
          'Stand with feet shoulder-width apart',
          'Lower your body as if sitting back into a chair',
          'Keep your chest up and knees behind toes',
          'Return to standing position'
        ]
      },
      {
        id: 'plank_fallback',
        name: 'Plank',
        category: 'strength',
        level: 'beginner',
        mechanic: 'isometric',
        equipment: 'body only',
        force: 'static',
        primaryMuscles: ['core'],
        secondaryMuscles: ['shoulders'],
        instructions: [
          'Start in push-up position',
          'Hold your body in a straight line',
          'Keep core engaged and breathe normally',
          'Hold for specified time'
        ]
      },
      {
        id: 'lunges_fallback',
        name: 'Lunges',
        category: 'strength',
        level: 'beginner',
        mechanic: 'compound',
        equipment: 'body only',
        force: 'push',
        primaryMuscles: ['quadriceps', 'glutes'],
        secondaryMuscles: ['hamstrings', 'calves'],
        instructions: [
          'Step forward with one leg',
          'Lower your hips until both knees are at 90 degrees',
          'Push back to starting position',
          'Alternate legs'
        ]
      }
    ];

    const workoutExercises = fallbackExercises.map(exercise => 
      WorkoutService.addWorkoutParameters(exercise, userProfile.fitnessLevel, userProfile.goals)
    );

    return {
      exercises: workoutExercises,
      estimatedTime: '20-25 minutes',
      difficulty: userProfile.fitnessLevel,
      focus: userProfile.goals.join(', '),
      totalExercises: workoutExercises.length,
      date: new Date().toDateString(),
      generatedBy: 'Fallback'
    };
  },

  // Get exercise by ID (useful for program creation)
  getExerciseById: async function(exerciseId) {
    try {
      const allExercises = await ExerciseAPI.getExercises();
      return allExercises.find(exercise => exercise.id === exerciseId);
    } catch (error) {
      console.error('Error getting exercise by ID:', error);
      return null;
    }
  },

  // Search exercises by name or muscle group
  searchExercises: async function(searchTerm, filters = {}) {
    try {
      const allExercises = await ExerciseAPI.getExercises();
      
      let filteredExercises = allExercises.filter(exercise => {
        const nameMatch = exercise.name.toLowerCase().includes(searchTerm.toLowerCase());
        const muscleMatch = exercise.primaryMuscles.some(muscle => 
          muscle.toLowerCase().includes(searchTerm.toLowerCase())
        );
        return nameMatch || muscleMatch;
      });

      // Apply additional filters
      if (filters.equipment) {
        filteredExercises = ExerciseAPI.filterByEquipment(filteredExercises, filters.equipment);
      }
      
      if (filters.level) {
        filteredExercises = ExerciseAPI.filterByLevel(filteredExercises, filters.level);
      }
      
      if (filters.category) {
        filteredExercises = ExerciseAPI.filterByCategory(filteredExercises, filters.category);
      }

      return filteredExercises;
    } catch (error) {
      console.error('Error searching exercises:', error);
      return [];
    }
  },

  // Get exercises by muscle group
  getExercisesByMuscleGroup: async function(muscleGroup) {
    try {
      const allExercises = await ExerciseAPI.getExercises();
      return ExerciseAPI.filterByMuscleGroup(allExercises, [muscleGroup]);
    } catch (error) {
      console.error('Error getting exercises by muscle group:', error);
      return [];
    }
  },

  // Get random exercises for exploration
  getRandomExercises: async function(count = 10, filters = {}) {
    try {
      let exercises = await ExerciseAPI.getExercises();
      
      // Apply filters if provided
      if (filters.equipment) {
        exercises = ExerciseAPI.filterByEquipment(exercises, filters.equipment);
      }
      
      if (filters.level) {
        exercises = ExerciseAPI.filterByLevel(exercises, filters.level);
      }
      
      // Shuffle and return requested count
      const shuffled = WorkoutService.shuffleArray(exercises);
      return shuffled.slice(0, count);
    } catch (error) {
      console.error('Error getting random exercises:', error);
      return [];
    }
  }
};

export default WorkoutService;