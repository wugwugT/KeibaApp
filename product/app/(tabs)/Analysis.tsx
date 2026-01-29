import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Analysis } from '@/src/screens/Analysis';

export default function TabTwoScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Analysis />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
