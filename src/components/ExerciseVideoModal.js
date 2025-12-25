// src/components/ExerciseVideoModal.js - Simplified version
import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Linking,
  Alert,
  Dimensions,
} from 'react-native';

const { width } = Dimensions.get('window');

const ExerciseVideoModal = ({ visible, exercise, onClose }) => {
  const openVideo = async () => {
    if (!exercise?.video?.url) {
      Alert.alert('Error', 'Video not available');
      return;
    }

    try {
      const supported = await Linking.canOpenURL(exercise.video.url);
      if (supported) {
        await Linking.openURL(exercise.video.url);
      } else {
        Alert.alert('Error', 'Cannot open video');
      }
    } catch (error) {
      console.error('Error opening video:', error);
      Alert.alert('Error', 'Failed to open video');
    }
  };

  if (!exercise) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: '#1a1a1a' }}>
        {/* Header */}
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingTop: 60,
          paddingBottom: 20,
          borderBottomWidth: 1,
          borderBottomColor: '#374151',
        }}>
          <View style={{ flex: 1 }}>
            <Text style={{
              fontSize: 20,
              fontWeight: 'bold',
              color: '#FFFFFF',
              marginBottom: 4,
            }}>
              {exercise.name}
            </Text>
            <Text style={{
              fontSize: 14,
              color: '#9CA3AF',
            }}>
              Exercise Form Guide
            </Text>
          </View>
          <TouchableOpacity 
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#374151',
              justifyContent: 'center',
              alignItems: 'center',
            }}
            onPress={onClose}
          >
            <Text style={{
              color: '#FFFFFF',
              fontSize: 18,
              fontWeight: 'bold',
            }}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1, paddingHorizontal: 20 }}>
          {/* Video Section */}
          {exercise.video ? (
            <View style={{
              marginTop: 20,
              backgroundColor: '#1F1F26',
              borderRadius: 16,
              overflow: 'hidden',
              marginBottom: 24,
            }}>
              <TouchableOpacity 
                style={{ position: 'relative', height: 200 }}
                onPress={openVideo}
                activeOpacity={0.8}
              >
                <Image
                  source={{ uri: exercise.video.thumbnails }}
                  style={{
                    width: '100%',
                    height: '100%',
                    borderTopLeftRadius: 16,
                    borderTopRightRadius: 16,
                  }}
                  resizeMode="cover"
                />
                <View style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                }}>
                  <View style={{
                    width: 60,
                    height: 60,
                    borderRadius: 30,
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                    <Text style={{
                      color: '#1a1a1a',
                      fontSize: 24,
                      fontWeight: 'bold',
                      marginLeft: 4,
                    }}>▶</Text>
                  </View>
                </View>
              </TouchableOpacity>
              
              <View style={{ padding: 16 }}>
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: '#FFFFFF',
                  marginBottom: 8,
                }}>
                  {exercise.video.title}
                </Text>
                
                <TouchableOpacity 
                  style={{
                    backgroundColor: '#FF0000',
                    paddingVertical: 12,
                    paddingHorizontal: 24,
                    borderRadius: 8,
                    alignItems: 'center',
                    marginTop: 8,
                  }}
                  onPress={openVideo}
                >
                  <Text style={{
                    color: '#FFFFFF',
                    fontSize: 16,
                    fontWeight: '600',
                  }}>
                    Watch on YouTube
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={{
              marginTop: 20,
              padding: 20,
              backgroundColor: '#1F1F26',
              borderRadius: 16,
              alignItems: 'center',
              marginBottom: 24,
            }}>
              <Text style={{
                fontSize: 48,
                marginBottom: 16,
              }}>📹</Text>
              <Text style={{
                color: '#EF4444',
                fontSize: 16,
                fontWeight: '600',
                textAlign: 'center',
                marginBottom: 8,
              }}>
                Video not available
              </Text>
              <Text style={{
                color: '#9CA3AF',
                fontSize: 14,
                textAlign: 'center',
              }}>
                Search "{exercise.name} exercise form" on YouTube
              </Text>
            </View>
          )}

          {/* Exercise Details */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{
              fontSize: 18,
              fontWeight: 'bold',
              color: '#FFFFFF',
              marginBottom: 16,
            }}>
              Exercise Information
            </Text>
            
            <View style={{
              backgroundColor: '#1F1F26',
              padding: 16,
              borderRadius: 12,
              marginBottom: 12,
            }}>
              <Text style={{
                fontSize: 12,
                fontWeight: '600',
                color: '#8B5CF6',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                marginBottom: 4,
              }}>
                Primary Muscles
              </Text>
              <Text style={{
                fontSize: 16,
                color: '#FFFFFF',
                textTransform: 'capitalize',
              }}>
                {exercise.primaryMuscles?.join(', ') || 'Full Body'}
              </Text>
            </View>

            {exercise.secondaryMuscles && exercise.secondaryMuscles.length > 0 && (
              <View style={{
                backgroundColor: '#1F1F26',
                padding: 16,
                borderRadius: 12,
                marginBottom: 12,
              }}>
                <Text style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: '#8B5CF6',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  marginBottom: 4,
                }}>
                  Secondary Muscles
                </Text>
                <Text style={{
                  fontSize: 16,
                  color: '#FFFFFF',
                  textTransform: 'capitalize',
                }}>
                  {exercise.secondaryMuscles.join(', ')}
                </Text>
              </View>
            )}

            <View style={{
              backgroundColor: '#1F1F26',
              padding: 16,
              borderRadius: 12,
              marginBottom: 12,
            }}>
              <Text style={{
                fontSize: 12,
                fontWeight: '600',
                color: '#8B5CF6',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                marginBottom: 4,
              }}>
                Equipment Needed
              </Text>
              <Text style={{
                fontSize: 16,
                color: '#FFFFFF',
                textTransform: 'capitalize',
              }}>
                {exercise.equipment || 'Body only'}
              </Text>
            </View>

            <View style={{
              backgroundColor: '#1F1F26',
              padding: 16,
              borderRadius: 12,
              marginBottom: 12,
            }}>
              <Text style={{
                fontSize: 12,
                fontWeight: '600',
                color: '#8B5CF6',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                marginBottom: 4,
              }}>
                Difficulty Level
              </Text>
              <Text style={{
                fontSize: 16,
                color: '#FFFFFF',
                textTransform: 'capitalize',
              }}>
                {exercise.level || 'Beginner'}
              </Text>
            </View>

            {/* Instructions */}
            {exercise.instructions && exercise.instructions.length > 0 && (
              <View style={{
                backgroundColor: '#1F1F26',
                padding: 16,
                borderRadius: 12,
                marginTop: 8,
                marginBottom: 12,
              }}>
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: '#FFFFFF',
                  marginBottom: 16,
                }}>
                  How to Perform
                </Text>
                {exercise.instructions.map((instruction, index) => (
                  <View key={index} style={{
                    flexDirection: 'row',
                    marginBottom: 12,
                    alignItems: 'flex-start',
                  }}>
                    <View style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: '#8B5CF6',
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginRight: 12,
                      flexShrink: 0,
                    }}>
                      <Text style={{
                        color: '#FFFFFF',
                        fontSize: 12,
                        fontWeight: 'bold',
                      }}>
                        {index + 1}
                      </Text>
                    </View>
                    <Text style={{
                      flex: 1,
                      fontSize: 14,
                      color: '#E5E7EB',
                      lineHeight: 20,
                    }}>
                      {instruction}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Workout Parameters */}
            {(exercise.sets || exercise.reps || exercise.rest) && (
              <View style={{
                backgroundColor: '#1F1F26',
                padding: 16,
                borderRadius: 12,
                marginBottom: 12,
              }}>
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: '#FFFFFF',
                  marginBottom: 12,
                }}>
                  Recommended
                </Text>
                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'space-around',
                }}>
                  {exercise.sets && (
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{
                        fontSize: 12,
                        color: '#9CA3AF',
                        marginBottom: 4,
                      }}>
                        Sets
                      </Text>
                      <Text style={{
                        fontSize: 18,
                        fontWeight: 'bold',
                        color: '#10B981',
                      }}>
                        {exercise.sets}
                      </Text>
                    </View>
                  )}
                  {exercise.reps && (
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{
                        fontSize: 12,
                        color: '#9CA3AF',
                        marginBottom: 4,
                      }}>
                        Reps
                      </Text>
                      <Text style={{
                        fontSize: 18,
                        fontWeight: 'bold',
                        color: '#10B981',
                      }}>
                        {exercise.reps}
                      </Text>
                    </View>
                  )}
                  {exercise.rest && (
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{
                        fontSize: 12,
                        color: '#9CA3AF',
                        marginBottom: 4,
                      }}>
                        Rest
                      </Text>
                      <Text style={{
                        fontSize: 18,
                        fontWeight: 'bold',
                        color: '#10B981',
                      }}>
                        {exercise.rest}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>

          {/* Safety Tips */}
          <View style={{ marginBottom: 40 }}>
            <Text style={{
              fontSize: 18,
              fontWeight: 'bold',
              color: '#FFFFFF',
              marginBottom: 16,
            }}>
              Form Tips
            </Text>
            <View style={{
              backgroundColor: '#1F1F26',
              padding: 16,
              borderRadius: 12,
            }}>
              <Text style={{
                fontSize: 14,
                color: '#E5E7EB',
                lineHeight: 20,
                marginBottom: 8,
              }}>
                • Focus on controlled movements rather than speed
              </Text>
              <Text style={{
                fontSize: 14,
                color: '#E5E7EB',
                lineHeight: 20,
                marginBottom: 8,
              }}>
                • Maintain proper breathing throughout the exercise
              </Text>
              <Text style={{
                fontSize: 14,
                color: '#E5E7EB',
                lineHeight: 20,
                marginBottom: 8,
              }}>
                • Stop if you feel sharp pain or discomfort
              </Text>
              <Text style={{
                fontSize: 14,
                color: '#E5E7EB',
                lineHeight: 20,
              }}>
                • Start with lighter weights/easier variations
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={{
          paddingHorizontal: 20,
          paddingVertical: 20,
          borderTopWidth: 1,
          borderTopColor: '#374151',
        }}>
          <TouchableOpacity 
            style={{
              backgroundColor: '#8B5CF6',
              paddingVertical: 16,
              borderRadius: 12,
              alignItems: 'center',
            }}
            onPress={onClose}
          >
            <Text style={{
              color: '#FFFFFF',
              fontSize: 16,
              fontWeight: '600',
            }}>
              Done
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default ExerciseVideoModal;