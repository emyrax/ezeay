import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Image, 
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import HeaderSection from '../../component/homeScreenTab/HeaderSection';
import RealmsSection from '../../component/RealmsSection';
import TrophyCabinetSection from '../../component/homeScreenTab/TrophyCabinetSection';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* We will insert Sections 3, 4, and 5 here */}
        <HeaderSection />
        <RealmsSection />
        <TrophyCabinetSection />
        
        {/* Bottom padding to ensure content isn't hidden behind the floating tab bar */}
        <View style={{ height: 100 }} /> 
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#13131A', // Dark background matching the image
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
});