import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

export default function DetailsScreen() {
  return (
    <>
      <Stack.Screen options={{ title: '' }} />
      <View style={styles.container}>
        <Text style={styles.text}>Details</Text>
        <StatusBar style="auto" />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textTransform: 'uppercase',
  },
});
