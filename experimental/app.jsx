import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from '@expo/vector-icons/Ionicons';
import HomeScreen from './HomeScreen'; // We will build this next

const Tab = createBottomTabNavigator();

// Custom Floating Tab Bar Component
const CustomTabBar = ({ state, descriptors, navigation }) => {
  return (
    <View style={styles.tabBarContainer}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate({ name: route.name, merge: true });
          }
        };

        // Assign icons based on route name
        let iconName;
        if (route.name === 'Home') iconName = isFocused ? 'home' : 'home-outline';
        else if (route.name === 'Quests') iconName = isFocused ? 'map' : 'map-outline';
        else if (route.name === 'Profile') iconName = isFocused ? 'person' : 'person-outline';

        return (
          <TouchableOpacity
            key={index}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarTestID}
            onPress={onPress}
            style={styles.tabItem}
          >
            <Icon name={iconName} size={24} color={isFocused ? '#B388FF' : '#6b6b83'} />
            <Text style={{ color: isFocused ? '#B388FF' : '#6b6b83', fontSize: 10, marginTop: 4 }}>
              {route.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{ headerShown: false }}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Quests" component={DummyScreen} />
        <Tab.Screen name="Profile" component={DummyScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const DummyScreen = () => <View style={{ flex: 1, backgroundColor: '#13131A' }} />;

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 25,
    left: 20,
    right: 20,
    backgroundColor: '#1E1E2A',
    borderRadius: 30,
    height: 70,
    justifyContent: 'space-around',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#2A2A3A',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});