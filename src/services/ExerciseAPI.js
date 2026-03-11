// Enhanced ExerciseAPI.js with comprehensive video mapping
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://exercisedb.dev/api';
const IMAGE_BASE_URL = 'https://exercisedb.dev';

class ExerciseAPI {
  constructor() {
    this.cacheKey = 'exercise_database_cache';
    this.lastUpdateKey = 'exercise_database_last_update';
    this.videoCacheKey = 'exercise_videos_cache';
    this.cacheExpiryHours = 24;
    
    // Comprehensive video mapping based on exercise names and muscle groups
    this.videoMappings = {
      // Push exercises
      'push': ['IODxDxX7oi4', 'How to do a Push Up | The Right Way'],
      'push-up': ['IODxDxX7oi4', 'How to do a Push Up | The Right Way'],
      'pushup': ['IODxDxX7oi4', 'How to do a Push Up | The Right Way'],
      'push up': ['IODxDxX7oi4', 'How to do a Push Up | The Right Way'],
      'incline push': ['cfQBmpfjqLk', 'Incline Push Up Tutorial'],
      'decline push': ['SKPab2YC8BE', 'Decline Push Up Form'],
      'diamond push': ['J0DnG1_S92I', 'Diamond Push Ups Tutorial'],
      
      // Squat variations
      'squat': ['YaXPRqUwItQ', 'How To Squat Properly'],
      'air squat': ['YaXPRqUwItQ', 'How To Squat Properly'],
      'bodyweight squat': ['YaXPRqUwItQ', 'How To Squat Properly'],
      'jump squat': ['A-cFYWvaBoY', 'Jump Squat Exercise'],
      'goblet squat': ['MeIiIdhvXT4', 'Goblet Squat Form'],
      'sumo squat': ['xDEQBFyEqmE', 'Sumo Squat Tutorial'],
      'wall sit': ['y-wV4Venusw', 'Wall Sit Exercise'],
      
      // Plank variations
      'plank': ['ASdvN_XEl_c', 'How to Plank | The Right Way'],
      'side plank': ['K2VljzCC16g', 'Side Plank Exercise'],
      'plank up': ['Gsf1OHbIFmE', 'Plank Up Downs'],
      'plank jack': ['JQHRI7dqqSg', 'Plank Jacks Exercise'],
      
      // Lunge variations
      'lunge': ['QE5TrFCsKtU', 'How to Do Forward Lunges'],
      'forward lunge': ['QE5TrFCsKtU', 'How to Do Forward Lunges'],
      'reverse lunge': ['xXgArDBWPdE', 'Reverse Lunge Form'],
      'lateral lunge': ['JYP_3GwiBzI', 'Lateral Lunge Exercise'],
      'walking lunge': ['L8fvypPrzzs', 'Walking Lunge Tutorial'],
      'jump lunge': ['tVzGbzQdCLQ', 'Jumping Lunges'],
      
      // Pull exercises
      'pull': ['eGo4IYlbE5g', 'How to do a Pull Up | The Right Way'],
      'pullup': ['eGo4IYlbE5g', 'How to do a Pull Up | The Right Way'],
      'pull-up': ['eGo4IYlbE5g', 'How to do a Pull Up | The Right Way'],
      'pull up': ['eGo4IYlbE5g', 'How to do a Pull Up | The Right Way'],
      'chin': ['brhF_bffUkM', 'Chin Up vs Pull Up'],
      'chin-up': ['brhF_bffUkM', 'Chin Up vs Pull Up'],
      
      // Burpee variations
      'burpee': ['TU8QYVW0gDU', 'How to do a Burpee | The Right Way'],
      'burpees': ['TU8QYVW0gDU', 'How to do a Burpee | The Right Way'],
      'half burpee': ['JMQXVC-5Lew', 'Modified Burpee Exercise'],
      
      // Mountain climber variations
      'mountain climb': ['nmwgirgXLYM', 'Mountain Climbers Exercise'],
      'mountain climber': ['nmwgirgXLYM', 'Mountain Climbers Exercise'],
      
      // Dumbbell exercises
      'dumbbell press': ['qEwKCR5JCog', 'Dumbbell Bench Press'],
      'dumbbell row': ['roCP6wCXPqo', 'Dumbbell Row Exercise'],
      'dumbbell curl': ['ykJmrZ5v0Oo', 'Dumbbell Bicep Curl'],
      'dumbbell shoulder': ['qEwKCR5JCog', 'Dumbbell Shoulder Press'],
      'dumbbell fly': ['eozdVDA78K0', 'Dumbbell Fly Exercise'],
      
      // Barbell exercises
      'deadlift': ['op9kVnSso6Q', 'How to Deadlift: Laird Hamilton'],
      'barbell row': ['9efgcAjQe7E', 'Barbell Row Exercise'],
      'bench press': ['rT7DgCr-3pg', 'Bench Press Form'],
      'overhead press': ['2yjwXTZQDDI', 'Overhead Press Tutorial'],
      'barbell curl': ['kwG2ipFRgfo', 'Barbell Curl Form'],
      
      // Core exercises
      'sit-up': ['jDwoBqPH0jk', 'Sit Ups Exercise'],
      'crunch': ['Xyd_fa5zoEU', 'Basic Crunch Exercise'],
      'bicycle crunch': ['9FGilxCbdz8', 'Bicycle Crunch Exercise'],
      'russian twist': ['wkD8rjkodUI', 'Russian Twist Exercise'],
      'leg raise': ['JB2oyawG9KI', 'Leg Raises Exercise'],
      'dead bug': ['g_BYB93ZSME', 'Dead Bug Exercise'],
      
      // Jumping exercises
      'jumping jack': ['c4DAnQ6DtF8', 'Jumping Jacks Exercise'],
      'jump rope': ['1BZM2Vre5oc', 'Jump Rope Basics'],
      'box jump': ['NBY9-kTuHEk', 'Box Jump Exercise'],
      'broad jump': ['1CM1KavqjzM', 'Broad Jump Tutorial'],
      
      // Stretching and mobility
      'stretch': ['4BOTvaRaDjI', 'Full Body Stretching Routine'],
      'hamstring stretch': ['oyflSKwngBU', 'Hamstring Stretch'],
      'quad stretch': ['85gI5CwKh0s', 'Quadriceps Stretch'],
      'hip flexor': ['UGEpQ1BRx-4', 'Hip Flexor Stretch'],
      'calf stretch': ['eG5U5LqLGLY', 'Calf Stretch Exercise'],
      
      // Cardio exercises
      'high knee': ['8opcQdC-V-U', 'High Knees Exercise'],
      'butt kick': ['5Y8zkIsM7_s', 'Butt Kickers Exercise'],
      'star jump': ['dmYwZH_BNd0', 'Star Jumps Exercise'],
      'bear crawl': ['KI4m35F-nF0', 'Bear Crawl Exercise'],
      'crab walk': ['PAIU6Zex18o', 'Crab Walk Exercise'],
      
      // Yoga and balance
      'downward dog': ['R-UKkdggTgE', 'Downward Dog Pose'],
      'warrior': ['oPeJjINBJ3E', 'Warrior Pose Tutorial'],
      'tree pose': ['nAmc9SNciTg', 'Tree Pose Balance'],
      'child pose': ['2Y4gJ5DyTvE', 'Child Pose Tutorial'],
      
      // Equipment specific
      'kettlebell swing': ['yeMXdkZ18EA', 'Kettlebell Swing Tutorial'],
      'kettlebell goblet': ['MeIiIdhvXT4', 'Kettlebell Goblet Squat'],
      'resistance band': ['UKJ7AtiymdU', 'Resistance Band Workout'],
      'medicine ball': ['OqjAWfOX_B4', 'Medicine Ball Exercises'],
      
      // Functional movements
      'turkish get': ['Lst1GiBmpjc', 'Turkish Get Up'],
      'farmer walk': ['xtOHXd-QDOk', 'Farmers Walk Exercise'],
      'sled push': ['vWdGLVNOJlM', 'Sled Push Exercise'],
      'tire flip': ['YWh5W0UKDEY', 'Tire Flip Exercise'],
      
      // Advanced movements
      'muscle': ['KQJkNxJGF1E', 'Muscle Up Tutorial'],
      'handstand': ['k9dRDaKIyxs', 'Handstand Tutorial'],
      'pistol squat': ['qOLTOJuyIkU', 'Pistol Squat Tutorial'],
      'archer': ['9O0IWLzNJKY', 'Archer Push Up'],
    };

    // Muscle group to video mapping for general exercises
    this.muscleGroupVideos = {
      'chest': ['IODxDxX7oi4', 'Chest Exercises'],
      'back': ['eGo4IYlbE5g', 'Back Exercises'],
      'shoulders': ['2yjwXTZQDDI', 'Shoulder Exercises'],
      'biceps': ['ykJmrZ5v0Oo', 'Bicep Exercises'],
      'triceps': ['J0DnG1_S92I', 'Tricep Exercises'],
      'quadriceps': ['YaXPRqUwItQ', 'Leg Exercises'],
      'hamstrings': ['op9kVnSso6Q', 'Hamstring Exercises'],
      'glutes': ['YaXPRqUwItQ', 'Glute Exercises'],
      'calves': ['eG5U5LqLGLY', 'Calf Exercises'],
      'core': ['ASdvN_XEl_c', 'Core Exercises'],
      'abdominals': ['Xyd_fa5zoEU', 'Ab Exercises'],
      'full body': ['TU8QYVW0gDU', 'Full Body Exercises'],
    };
  }

  // Enhanced exercise transformation with video integration
  transformExercise = (exercise) => {
    const transformedExercise = {
      id: exercise.id,
      name: exercise.name,
      category: exercise.category || 'strength',
      level: exercise.level || 'beginner',
      mechanic: exercise.mechanic || 'compound',
      equipment: exercise.equipment || 'body only',
      force: exercise.force || 'push',
      primaryMuscles: exercise.primaryMuscles || [],
      secondaryMuscles: exercise.secondaryMuscles || [],
      instructions: exercise.instructions || [],
      images: exercise.images ? exercise.images.map(img => `${IMAGE_BASE_URL}/${img}`) : []
    };

    // Add video information
    const videoInfo = this.getVideoForExercise(exercise.name, exercise.primaryMuscles);
    if (videoInfo) {
      transformedExercise.video = videoInfo;
    }

    return transformedExercise;
  };

  // Get video for specific exercise
  getVideoForExercise = (exerciseName, primaryMuscles = []) => {
    if (!exerciseName) return null;

    const cleanName = exerciseName.toLowerCase();
    
    // First, try exact matches with exercise name
    for (const [key, videoData] of Object.entries(this.videoMappings)) {
      if (cleanName.includes(key)) {
        return {
          videoId: videoData[0],
          title: videoData[1],
          thumbnails: this.getThumbnailURL(videoData[0]),
          url: this.getVideoURL(videoData[0])
        };
      }
    }

    // If no exact match, try muscle group mapping
    if (primaryMuscles && primaryMuscles.length > 0) {
      for (const muscle of primaryMuscles) {
        const muscleLower = muscle.toLowerCase();
        if (this.muscleGroupVideos[muscleLower]) {
          const videoData = this.muscleGroupVideos[muscleLower];
          return {
            videoId: videoData[0],
            title: `${videoData[1]} - ${exerciseName}`,
            thumbnails: this.getThumbnailURL(videoData[0]),
            url: this.getVideoURL(videoData[0])
          };
        }
      }
    }

    // Return a general fitness video as fallback
    return {
      videoId: 'IODxDxX7oi4',
      title: `Exercise Guide - ${exerciseName}`,
      thumbnails: this.getThumbnailURL('IODxDxX7oi4'),
      url: this.getVideoURL('IODxDxX7oi4')
    };
  };

  // Get YouTube video URL
  getVideoURL = (videoId) => {
    return `https://www.youtube.com/watch?v=${videoId}`;
  };

  // Get video thumbnail URL
  getThumbnailURL = (videoId, quality = 'maxresdefault') => {
    return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
  };

  // Check if cache is still valid
  async isCacheValid() {
    try {
      const lastUpdate = await AsyncStorage.getItem(this.lastUpdateKey);
      if (!lastUpdate) return false;
      
      const lastUpdateTime = new Date(lastUpdate);
      const now = new Date();
      const hoursSinceUpdate = (now - lastUpdateTime) / (1000 * 60 * 60);
      
      return hoursSinceUpdate < this.cacheExpiryHours;
    } catch (error) {
      console.error('Error checking cache validity:', error);
      return false;
    }
  }

  // Get exercises from cache
  async getFromCache() {
    try {
      const cached = await AsyncStorage.getItem(this.cacheKey);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Error reading from cache:', error);
      return null;
    }
  }

  // Save exercises to cache
  async saveToCache(exercises) {
    try {
      await AsyncStorage.setItem(this.cacheKey, JSON.stringify(exercises));
      await AsyncStorage.setItem(this.lastUpdateKey, new Date().toISOString());
    } catch (error) {
      console.error('Error saving to cache:', error);
    }
  }

  // Fetch all exercises from the combined JSON file
  async fetchAllExercises() {
    try {
      console.log('Fetching exercises from exercisedb.dev...');
      
      const response = await fetch(`${API_BASE_URL}/exercises?limit=800&offset=0`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      const exercises = data.exercises || data || [];
      
      const transformedExercises = exercises.map(ex => this.transformExerciseDB(ex));
      
      await this.saveToCache(transformedExercises);
      console.log(`Successfully fetched and cached ${transformedExercises.length} exercises`);
      return transformedExercises;
    } catch (error) {
      console.error('Error fetching exercises:', error);
      throw error;
    }
  }

  // Transform exercisedb.dev format to our app format
  transformExerciseDB = (exercise) => {
    const name = exercise.name || '';

    // Handle both old and new API field names
    let primaryMuscles = [];
    if (exercise.targetMuscles && exercise.targetMuscles.length > 0) {
      primaryMuscles = exercise.targetMuscles;
    } else if (exercise.target) {
      primaryMuscles = [exercise.target];
    }

    const secondaryMuscles = exercise.secondaryMuscles || [];

    // equipments is array in new API, equipment is string in old
    let equipment = 'body only';
    if (exercise.equipments && exercise.equipments.length > 0) {
      equipment = exercise.equipments[0];
    } else if (exercise.equipment) {
      equipment = exercise.equipment;
    }

    const bodyPart = (exercise.bodyParts && exercise.bodyParts[0]) || exercise.bodyPart || '';

    // Determine level from exercise name/type heuristic since API doesn't provide it
    const level = this.inferLevel(name, equipment);

    const transformed = {
      id: exercise.exerciseId || exercise.id || `ex_${Math.random().toString(36).substr(2, 9)}`,
      name: name,
      category: this.mapBodyPartToCategory(bodyPart),
      level: level,
      mechanic: this.inferMechanic(bodyPart),
      equipment: equipment.toLowerCase(),
      force: 'push',
      primaryMuscles: Array.isArray(primaryMuscles) ? primaryMuscles : [primaryMuscles],
      secondaryMuscles: Array.isArray(secondaryMuscles) ? secondaryMuscles : [],
      instructions: exercise.instructions || [],
      images: exercise.imageUrl ? [`${IMAGE_BASE_URL}/${exercise.imageUrl}`] : [],
    };

    const videoInfo = this.getVideoForExercise(name, transformed.primaryMuscles);
    if (videoInfo) transformed.video = videoInfo;

    return transformed;
  };

  mapBodyPartToCategory(bodyPart) {
    const cardioBodyParts = ['cardio', 'waist'];
    if (!bodyPart) return 'strength';
    return cardioBodyParts.includes(bodyPart.toLowerCase()) ? 'cardio' : 'strength';
  }

  inferLevel(name, equipment) {
    const advancedKeywords = ['muscle up', 'handstand', 'pistol', 'planche', 'clean', 'snatch', 'jerk'];
    const beginnerKeywords = ['push-up', 'push up', 'squat', 'lunge', 'plank', 'crunch', 'sit-up', 'jumping jack', 'walk'];
    const nameLower = name.toLowerCase();

    if (advancedKeywords.some(k => nameLower.includes(k))) return 'advanced';
    if (beginnerKeywords.some(k => nameLower.includes(k))) return 'beginner';
    if (equipment === 'body only' || equipment === 'none') return 'beginner';
    return 'intermediate';
  }

  inferMechanic(bodyPart) {
    const isolationParts = ['biceps', 'triceps', 'calves', 'forearms'];
    if (!bodyPart) return 'compound';
    return isolationParts.includes(bodyPart.toLowerCase()) ? 'isolation' : 'compound';
  }

  // Main method to get exercises (cache-first approach)
  async getExercises() {
    try {
      // Always check cache first - fastest path
      const cachedExercises = await this.getFromCache();
      if (cachedExercises && cachedExercises.length > 0) {
        console.log(`Using cached exercises: ${cachedExercises.length} exercises`);
        
        // Refresh cache in background if expired (non-blocking)
        this.isCacheValid().then(valid => {
          if (!valid) {
            console.log('Cache expired, refreshing in background...');
            this.fetchAllExercises().catch(err => 
              console.log('Background refresh failed:', err.message)
            );
          }
        });
        
        return cachedExercises;
      }
      
      // No cache - fetch from API
      return await this.fetchAllExercises();
    } catch (error) {
      console.error('Error in getExercises:', error);
      return this.getFallbackExercisesWithVideos();
    }
  }

  // Non-blocking background preload - call this on app start
  preloadExercises() {
    this.getExercises().catch(err => 
      console.log('Preload failed:', err.message)
    );
  }

  // Enhanced fallback exercises with video integration
  getFallbackExercisesWithVideos() {
    return [
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
        ],
        images: [],
        video: {
          videoId: 'IODxDxX7oi4',
          title: 'How to do a Push Up | The Right Way',
          thumbnails: this.getThumbnailURL('IODxDxX7oi4'),
          url: this.getVideoURL('IODxDxX7oi4')
        }
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
        ],
        images: [],
        video: {
          videoId: 'YaXPRqUwItQ',
          title: 'How To Squat Properly',
          thumbnails: this.getThumbnailURL('YaXPRqUwItQ'),
          url: this.getVideoURL('YaXPRqUwItQ')
        }
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
        ],
        images: [],
        video: {
          videoId: 'ASdvN_XEl_c',
          title: 'How to Plank | The Right Way',
          thumbnails: this.getThumbnailURL('ASdvN_XEl_c'),
          url: this.getVideoURL('ASdvN_XEl_c')
        }
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
        ],
        images: [],
        video: {
          videoId: 'QE5TrFCsKtU',
          title: 'How to Do Forward Lunges',
          thumbnails: this.getThumbnailURL('QE5TrFCsKtU'),
          url: this.getVideoURL('QE5TrFCsKtU')
        }
      }
    ];
  }

  // All other existing methods remain the same...
  filterByEquipment(exercises, equipment) {
    if (!equipment || equipment.length === 0) return exercises;
    
    return exercises.filter(exercise => {
      if (equipment.includes('body only') && 
          (exercise.equipment === 'body only' || exercise.equipment === 'none')) {
        return true;
      }
      return equipment.includes(exercise.equipment);
    });
  }

  filterByMuscleGroup(exercises, targetMuscles) {
    if (!targetMuscles || targetMuscles.length === 0) return exercises;
    
    return exercises.filter(exercise => {
      const allMuscles = [...exercise.primaryMuscles, ...exercise.secondaryMuscles]
        .map(muscle => muscle.toLowerCase());
      
      return targetMuscles.some(target => 
        allMuscles.some(muscle => muscle.includes(target.toLowerCase()))
      );
    });
  }

  filterByLevel(exercises, level) {
    if (!level) return exercises;
    
    const levelOrder = { beginner: 0, intermediate: 1, advanced: 2 };
    const userLevel = levelOrder[level];
    
    return exercises.filter(exercise => {
      const exerciseLevel = levelOrder[exercise.level];
      return exerciseLevel <= userLevel;
    });
  }

  filterByCategory(exercises, categories) {
    if (!categories || categories.length === 0) return exercises;
    
    return exercises.filter(exercise => 
      categories.includes(exercise.category)
    );
  }

  async getExercisesForWorkout(userProfile) {
    try {
      const allExercises = await this.getExercises();
      
      let filteredExercises = allExercises;
      
      if (userProfile.equipment) {
        filteredExercises = this.filterByEquipment(filteredExercises, userProfile.equipment);
      }
      
      if (userProfile.fitnessLevel) {
        filteredExercises = this.filterByLevel(filteredExercises, userProfile.fitnessLevel);
      }
      
      if (userProfile.goals && userProfile.goals.length > 0) {
        const targetMuscles = this.mapGoalsToMuscles(userProfile.goals);
        if (targetMuscles.length > 0) {
          const muscleFilteredExercises = this.filterByMuscleGroup(filteredExercises, targetMuscles);
          if (muscleFilteredExercises.length >= 4) {
            filteredExercises = muscleFilteredExercises;
          }
        }
      }
      
      if (filteredExercises.length < 4) {
        console.log('Not enough filtered exercises, including body-only exercises');
        const bodyOnlyExercises = allExercises.filter(ex => 
          ex.equipment === 'body only' || ex.equipment === 'none'
        );
        filteredExercises = [...new Set([...filteredExercises, ...bodyOnlyExercises])];
      }
      
      return filteredExercises;
    } catch (error) {
      console.error('Error getting exercises for workout:', error);
      return this.getFallbackExercisesWithVideos();
    }
  }

  mapGoalsToMuscles(goals) {
    const goalMuscleMap = {
      'strength': ['chest', 'back', 'quadriceps', 'shoulders'],
      'cardio': ['heart', 'full body'],
      'muscle building': ['chest', 'back', 'biceps', 'triceps', 'quadriceps', 'shoulders'],
      'weight loss': ['full body', 'core', 'legs']
    };
    
    let targetMuscles = [];
    goals.forEach(goal => {
      if (goalMuscleMap[goal]) {
        targetMuscles.push(...goalMuscleMap[goal]);
      }
    });
    
    return [...new Set(targetMuscles)];
  }

  // Force refresh cache
  async refreshCache() {
    try {
      await AsyncStorage.removeItem(this.cacheKey);
      await AsyncStorage.removeItem(this.lastUpdateKey);
      return await this.fetchAllExercises();
    } catch (error) {
      console.error('Error refreshing cache:', error);
      throw error;
    }
  }

  // Get cache info for debugging
  async getCacheInfo() {
    try {
      const lastUpdate = await AsyncStorage.getItem(this.lastUpdateKey);
      const cachedData = await AsyncStorage.getItem(this.cacheKey);
      const exerciseCount = cachedData ? JSON.parse(cachedData).length : 0;
      
      return {
        lastUpdate: lastUpdate ? new Date(lastUpdate) : null,
        exerciseCount,
        isValid: await this.isCacheValid()
      };
    } catch (error) {
      console.error('Error getting cache info:', error);
      return null;
    }
  }

  // Add custom video mapping
  addVideoMapping(exerciseName, videoId, title) {
    this.videoMappings[exerciseName.toLowerCase()] = [videoId, title];
  }

  // Get all available video mappings (for debugging)
  getVideoMappings() {
    return this.videoMappings;
  }
}

// Export singleton instance
export default new ExerciseAPI();