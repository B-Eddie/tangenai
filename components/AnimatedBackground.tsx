import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, useColorScheme } from 'react-native';

const { width, height } = Dimensions.get('window');

const NUM_PARTICLES = 15; // Increased number of particles

const AnimatedBackground = ({ particleColor = '#ff7a00', opacityLight = 0.2, opacityDark = 0.3 }) => {
  const isDarkMode = useColorScheme() === 'dark';
  const opacity = isDarkMode ? opacityDark : opacityLight;
  
  // Create arrays of animated values for particles
  const particles = Array.from({ length: NUM_PARTICLES }, () => ({
    position: useRef(new Animated.ValueXY()).current,
    rotation: useRef(new Animated.Value(0)).current,
    scale: useRef(new Animated.Value(1)).current,
    opacity: useRef(new Animated.Value(0.3)).current
  }));

  // Function to create animation for a particle
  const animateParticle = (
    position,
    rotation,
    scale,
    particleOpacity,
    duration,
    delay = 0
  ) => {
    // Reset values
    position.setValue({ x: 0, y: 0 });
    rotation.setValue(0);
    scale.setValue(1);
    particleOpacity.setValue(0.3);
    
    // Define animations
    const moveAnimation = Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        // Movement animation
        Animated.timing(position, {
          toValue: { 
            x: Math.random() * 100 - 50, 
            y: -50 
          },
          duration: duration * 0.25,
          useNativeDriver: true,
        }),
        // Rotation animation
        Animated.timing(rotation, {
          toValue: 0.25,
          duration: duration * 0.25,
          useNativeDriver: true,
        }),
        // Scale animation
        Animated.timing(scale, {
          toValue: 1.1,
          duration: duration * 0.25,
          useNativeDriver: true,
        }),
        // Opacity animation
        Animated.timing(particleOpacity, {
          toValue: 0.5,
          duration: duration * 0.25,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        // Movement animation
        Animated.timing(position, {
          toValue: { 
            x: Math.random() * 100 - 50, 
            y: 20 
          },
          duration: duration * 0.25,
          useNativeDriver: true,
        }),
        // Rotation animation
        Animated.timing(rotation, {
          toValue: 0.5,
          duration: duration * 0.25,
          useNativeDriver: true,
        }),
        // Scale animation
        Animated.timing(scale, {
          toValue: 0.9,
          duration: duration * 0.25,
          useNativeDriver: true,
        }),
        // Opacity animation
        Animated.timing(particleOpacity, {
          toValue: 0.3,
          duration: duration * 0.25,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        // Movement animation
        Animated.timing(position, {
          toValue: { 
            x: Math.random() * 100 - 50, 
            y: 40 
          },
          duration: duration * 0.25,
          useNativeDriver: true,
        }),
        // Rotation animation
        Animated.timing(rotation, {
          toValue: 0.75,
          duration: duration * 0.25,
          useNativeDriver: true,
        }),
        // Scale animation
        Animated.timing(scale, {
          toValue: 1.05,
          duration: duration * 0.25,
          useNativeDriver: true,
        }),
        // Opacity animation
        Animated.timing(particleOpacity, {
          toValue: 0.5,
          duration: duration * 0.25,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        // Movement animation
        Animated.timing(position, {
          toValue: { x: 0, y: 0 },
          duration: duration * 0.25,
          useNativeDriver: true,
        }),
        // Rotation animation
        Animated.timing(rotation, {
          toValue: 1,
          duration: duration * 0.25,
          useNativeDriver: true,
        }),
        // Scale animation
        Animated.timing(scale, {
          toValue: 1,
          duration: duration * 0.25,
          useNativeDriver: true,
        }),
        // Opacity animation
        Animated.timing(particleOpacity, {
          toValue: 0.3,
          duration: duration * 0.25,
          useNativeDriver: true,
        }),
      ]),
    ]);
    
    // Loop animation
    Animated.loop(moveAnimation).start();
  };

  useEffect(() => {
    // Start animations with different durations and delays for each particle
    particles.forEach((particle, index) => {
      const duration = 15000 + Math.random() * 20000; // Random duration between 15-35s
      const delay = Math.random() * 10000; // Random delay between 0-10s
      animateParticle(
        particle.position,
        particle.rotation,
        particle.scale,
        particle.opacity,
        duration,
        delay
      );
    });
    
    return () => {
      // Cleanup animations if needed (though React Native handles this automatically)
    };
  }, []);

  return (
    <View style={styles.container}>
      {particles.map((particle, index) => {
        const rotateInterpolate = particle.rotation.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '360deg'],
        });

        const size = 40 + Math.random() * 100; // Random size between 40-140
        
        return (
          <Animated.View
            key={index}
            style={[
              styles.particle,
              {
                width: size,
                height: size,
                left: `${Math.random() * 80 + 10}%`, // Random position between 10-90%
                top: `${Math.random() * 80 + 10}%`,
                backgroundColor: particleColor,
                opacity: particle.opacity.interpolate({
                  inputRange: [0.3, 0.5],
                  outputRange: [0.3 * opacity, 0.5 * opacity],
                }),
                transform: [
                  { translateX: particle.position.x },
                  { translateY: particle.position.y },
                  { rotate: rotateInterpolate },
                  { scale: particle.scale }
                ],
              },
            ]}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    zIndex: -1,
  },
  particle: {
    position: 'absolute',
    borderRadius: 100, // Make it a circle
  },
});

export default AnimatedBackground;