import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, useColorScheme } from 'react-native';

const { width, height } = Dimensions.get('window');

const AnimatedBackground = ({ particleColor = '#ff7a00', opacityLight = 0.2, opacityDark = 0.3 }) => {
  const isDarkMode = useColorScheme() === 'dark';
  const opacity = isDarkMode ? opacityDark : opacityLight;
  
  // Create animated values for each particle
  const particle1 = useRef(new Animated.ValueXY()).current;
  const particle2 = useRef(new Animated.ValueXY()).current;
  const particle3 = useRef(new Animated.ValueXY()).current;
  const particle4 = useRef(new Animated.ValueXY()).current;
  const particle5 = useRef(new Animated.ValueXY()).current;
  
  const rotate1 = useRef(new Animated.Value(0)).current;
  const rotate2 = useRef(new Animated.Value(0)).current;
  const rotate3 = useRef(new Animated.Value(0)).current;
  const rotate4 = useRef(new Animated.Value(0)).current;
  const rotate5 = useRef(new Animated.Value(0)).current;
  
  const scale1 = useRef(new Animated.Value(1)).current;
  const scale2 = useRef(new Animated.Value(1)).current;
  const scale3 = useRef(new Animated.Value(1)).current;
  const scale4 = useRef(new Animated.Value(1)).current;
  const scale5 = useRef(new Animated.Value(1)).current;
  
  const opacity1 = useRef(new Animated.Value(0.3)).current;
  const opacity2 = useRef(new Animated.Value(0.3)).current;
  const opacity3 = useRef(new Animated.Value(0.3)).current;
  const opacity4 = useRef(new Animated.Value(0.3)).current;
  const opacity5 = useRef(new Animated.Value(0.3)).current;

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
            x: Math.random() * 50 - 25, 
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
            x: Math.random() * 50 - 25, 
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
            x: Math.random() * 50 - 25, 
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
    animateParticle(particle1, rotate1, scale1, opacity1, 25000, 0);
    animateParticle(particle2, rotate2, scale2, opacity2, 30000, 5000);
    animateParticle(particle3, rotate3, scale3, opacity3, 20000, 10000);
    animateParticle(particle4, rotate4, scale4, opacity4, 22000, 7000);
    animateParticle(particle5, rotate5, scale5, opacity5, 18000, 3000);
    
    return () => {
      // Cleanup animations if needed (though React Native handles this automatically)
    };
  }, []);

  // Interpolate rotation values to create rotate transform
  const rotateInterpolate1 = rotate1.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  
  const rotateInterpolate2 = rotate2.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  
  const rotateInterpolate3 = rotate3.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  
  const rotateInterpolate4 = rotate4.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  
  const rotateInterpolate5 = rotate5.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.particle,
          {
            width: 80,
            height: 80,
            left: '10%',
            top: '20%',
            backgroundColor: particleColor,
            opacity: opacity1.interpolate({
              inputRange: [0.3, 0.5],
              outputRange: [0.3 * opacity, 0.5 * opacity],
            }),
            transform: [
              { translateX: particle1.x },
              { translateY: particle1.y },
              { rotate: rotateInterpolate1 },
              { scale: scale1 }
            ],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.particle,
          {
            width: 120,
            height: 120,
            left: '70%',
            top: '60%',
            backgroundColor: particleColor,
            opacity: opacity2.interpolate({
              inputRange: [0.3, 0.5],
              outputRange: [0.3 * opacity, 0.5 * opacity],
            }),
            transform: [
              { translateX: particle2.x },
              { translateY: particle2.y },
              { rotate: rotateInterpolate2 },
              { scale: scale2 }
            ],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.particle,
          {
            width: 60,
            height: 60,
            left: '30%',
            top: '70%',
            backgroundColor: particleColor,
            opacity: opacity3.interpolate({
              inputRange: [0.3, 0.5],
              outputRange: [0.3 * opacity, 0.5 * opacity],
            }),
            transform: [
              { translateX: particle3.x },
              { translateY: particle3.y },
              { rotate: rotateInterpolate3 },
              { scale: scale3 }
            ],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.particle,
          {
            width: 100,
            height: 100,
            left: '80%',
            top: '15%',
            backgroundColor: particleColor,
            opacity: opacity4.interpolate({
              inputRange: [0.3, 0.5],
              outputRange: [0.3 * opacity, 0.5 * opacity],
            }),
            transform: [
              { translateX: particle4.x },
              { translateY: particle4.y },
              { rotate: rotateInterpolate4 },
              { scale: scale4 }
            ],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.particle,
          {
            width: 70,
            height: 70,
            left: '50%',
            top: '50%',
            backgroundColor: particleColor,
            opacity: opacity5.interpolate({
              inputRange: [0.3, 0.5],
              outputRange: [0.3 * opacity, 0.5 * opacity],
            }),
            transform: [
              { translateX: particle5.x },
              { translateY: particle5.y },
              { rotate: rotateInterpolate5 },
              { scale: scale5 }
            ],
          },
        ]}
      />
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