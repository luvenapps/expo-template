import { Link, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <>
      <Stack.Screen options={{ title: '' }} />
      <View style={styles.container}>
        <Text style={styles.text}>Welcome</Text>
        <Link href="/details" asChild>
          <Pressable style={styles.button}>
            <Text style={styles.buttonText}>View Details</Text>
          </Pressable>
        </Link>
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
    fontSize: 36,
    fontWeight: 'bold',
    color: '#333',
    textTransform: 'uppercase',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
