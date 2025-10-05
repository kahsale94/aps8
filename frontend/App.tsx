import React, { useState, useEffect } from 'react';
import { Modal, StyleSheet, Text, TextInput, View, Button, Alert, Pressable } from 'react-native';
import MapView, { Marker, Callout, PROVIDER_GOOGLE, MapPressEvent } from 'react-native-maps';

// Tipos de materiais que o usuário pode selecionar
const MATERIAL_TYPES = ["Plástico", "Vidro", "Metal", "Papel", "Orgânico", "Eletrônicos"];

interface MarkerData {
  id: number;
  title: string;
  latitude: number;
  longitude: number;
  materials: string[];
}

// O endereço da nossa API no backend (IP especial do emulador para o host)
const API_URL = 'http://10.0.2.2:3000';

function App(): React.JSX.Element {
  const [markers, setMarkers] = useState<MarkerData[]>([]);
  const [isModalVisible, setModalVisible] = useState(false);
  const [newPointCoordinate, setNewPointCoordinate] = useState<{ latitude: number; longitude: number } | null>(null);
  const [pointTitle, setPointTitle] = useState('');
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);

  // NOVO: useEffect para buscar os dados quando o app iniciar
  useEffect(() => {
    const fetchEcopontos = async () => {
      try {
        const response = await fetch(`${API_URL}/ecopontos`);
        if (!response.ok) {
          throw new Error('Falha ao buscar os pontos do servidor.');
        }
        const data: MarkerData[] = await response.json();
        setMarkers(data); // Preenchemos nosso estado com os dados do banco
      } catch (error) {
        console.error(error);
        Alert.alert("Erro", "Não foi possível carregar os pontos de coleta.");
      }
    };

    fetchEcopontos();
  }, []);

  // Função para lidar com a seleção de materiais no modal
  const toggleMaterial = (material: string) => {
    setSelectedMaterials(prev =>
      prev.includes(material)
        ? prev.filter(m => m !== material)
        : [...prev, material]
    );
  };

  // Função para limpar e fechar o modal
  const closeAndResetModal = () => {
    setPointTitle('');
    setNewPointCoordinate(null);
    setModalVisible(false);
  };

  const handleMapPress = (event: MapPressEvent) => {
    // Se o toque foi em um marcador existente (e não no mapa), não faça nada.
    if (event.nativeEvent.action === 'marker-press') {
      return;
    }

    // Se o toque foi no mapa, continue com o fluxo normal de abrir o modal.
    setNewPointCoordinate(event.nativeEvent.coordinate);
    setModalVisible(true);
  };

  // Manipulador para salvar o novo ponto
  const handleSavePoint = async () => {
    if (pointTitle.trim() === '' || !newPointCoordinate) {
      Alert.alert("Erro", "Por favor, insira um nome para o ponto de coleta.");
      return;
    }

    const newPointData = {
      title: pointTitle,
      latitude: newPointCoordinate.latitude,
      longitude: newPointCoordinate.longitude,
      materials: selectedMaterials, // Enviamos os materiais selecionados

    };

    try {
      const response = await fetch(`${API_URL}/ecopontos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPointData),
      });

      if (!response.ok) {
        throw new Error('Falha ao salvar o ponto no servidor.');
      }

      const savedMarker: MarkerData = await response.json();
      setMarkers(prevMarkers => [...prevMarkers, savedMarker]);
      closeAndResetModal();

    } catch (error) {
      console.error(error);
      Alert.alert("Erro", "Não foi possível salvar o ponto de coleta. Tente novamente.");
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{ latitude: -23.55052, longitude: -46.633308, latitudeDelta: 0.0922, longitudeDelta: 0.0421 }}
        onPress={handleMapPress}
      >
        {markers.map((marker, index) => (
          <Marker
            key={marker.id}
            coordinate={{ latitude: marker.latitude, longitude: marker.longitude }}
          >
            <Callout>
              <View>
                <Text style={styles.calloutTitle}>{marker.title}</Text>
                <Text>{marker.materials ? marker.materials.join(', ') : 'Materiais não informados'}</Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={closeAndResetModal} // Fecha o modal se o usuário apertar "voltar" no Android
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Adicionar Novo Ponto de Coleta</Text>
            <TextInput
              style={styles.input}
              placeholder="Nome do Ponto (ex: Posto da Esquina)"
              value={pointTitle}
              onChangeText={setPointTitle}
            />

            {/* NOVA Seção para selecionar materiais */}
            <Text style={styles.materialsLabel}>Materiais Aceitos:</Text>
            <View style={styles.materialsContainer}>
              {MATERIAL_TYPES.map(material => (
                <Pressable
                  key={material}
                  style={[styles.materialButton, selectedMaterials.includes(material) && styles.materialButtonSelected]}
                  onPress={() => toggleMaterial(material)}
                >
                  <Text style={[styles.materialButtonText, selectedMaterials.includes(material) && styles.materialButtonTextSelected]}>{material}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.buttonContainer}>
              <Button title="Cancelar" onPress={closeAndResetModal} color="#f44336" />
              <Button title="Salvar Ponto" onPress={handleSavePoint} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Adicionamos novos estilos para os materiais e o callout
const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { ...StyleSheet.absoluteFillObject },
  calloutTitle: { fontWeight: 'bold', fontSize: 16 },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  modalView: { width: '90%', backgroundColor: 'white', borderRadius: 20, padding: 20, alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  input: { height: 40, borderColor: 'gray', borderWidth: 1, borderRadius: 5, marginBottom: 15, width: '100%', paddingHorizontal: 10 },
  materialsLabel: { fontWeight: 'bold', marginBottom: 10 },
  materialsContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginBottom: 20 },
  materialButton: { paddingHorizontal: 12, paddingVertical: 8, margin: 4, backgroundColor: '#eee', borderRadius: 15 },
  materialButtonSelected: { backgroundColor: '#007bff' },
  materialButtonText: { color: '#333' },
  materialButtonTextSelected: { color: 'white' },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-around', width: '100%' },
});

export default App;