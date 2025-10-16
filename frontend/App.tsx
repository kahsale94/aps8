import React, { useState, useEffect, useRef } from 'react';
import { Modal, StyleSheet, Text, TextInput, View, Button, Alert, Pressable, PermissionsAndroid, Platform, FlatList, ActivityIndicator } from 'react-native';
import MapView, { Marker, Callout, PROVIDER_GOOGLE, MapPressEvent, Region } from 'react-native-maps';
import Geolocation from 'react-native-geolocation-service';

const MATERIAL_TYPES = ["Plástico", "Vidro", "Metal", "Papel", "Orgânico", "Eletrônicos"];

interface MarkerData {
  id: number;
  title: string;
  latitude: number;
  longitude: number;
  materials: string[];
}

interface NearbyPointData extends MarkerData {
  distance: number;
}

const API_URL = 'http://10.0.2.2:3000';

// MUDANÇA 1: Definimos a região padrão fora do componente
const SAO_PAULO_REGION: Region = {
  latitude: -23.55052,
  longitude: -46.633308,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

function App(): React.JSX.Element {
  // --- ESTADOS ---
  const [markers, setMarkers] = useState<MarkerData[]>([]);
  const [isListVisible, setListVisible] = useState(false); // Para controlar a lista overlay
  const [nearbyPoints, setNearbyPoints] = useState<NearbyPointData[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isModalVisible, setModalVisible] = useState(false);
  const [editingMarker, setEditingMarker] = useState<MarkerData | null>(null);
  const [formCoordinate, setFormCoordinate] = useState<{ latitude: number; longitude: number } | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formMaterials, setFormMaterials] = useState<string[]>([]);

  // MUDANÇA 2: Criamos uma referência para o nosso MapView
  const mapRef = useRef<MapView>(null);

  // --- FUNÇÕES DE BUSCA DE DADOS ---
  // MUDANÇA PRINCIPAL: Movemos as funções para fora do useEffect
  const fetchEcopontos = async () => {
    try {
      const response = await fetch(`${API_URL}/ecopontos`);
      if (!response.ok) throw new Error('Falha ao buscar os pontos.');
      const data: MarkerData[] = await response.json();
      setMarkers(data);
    } catch (error) {
      console.error(error);
      Alert.alert("Erro", "Não foi possível carregar os pontos de coleta.");
    }
  };
  // NOVA FUNÇÃO: Busca os pontos próximos quando o usuário muda para a tela de lista
  // --- FUNÇÕES HELPER ---
  const fetchNearbyPoints = () => {
    setIsLoadingList(true);
    Geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const response = await fetch(`${API_URL}/ecopontos/perto?lat=${latitude}&lon=${longitude}`);
          if (!response.ok) throw new Error('Falha ao buscar pontos próximos.');
          const data = await response.json();
          setNearbyPoints(data);
        } catch (error) {
          Alert.alert("Erro", "Não foi possível carregar a lista de pontos.");
        } finally {
          setIsLoadingList(false);
        }
      },
      (error) => {
        Alert.alert("Erro", "Não foi possível obter sua localização para gerar a lista.");
        setIsLoadingList(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  // --- LÓGICA DE INICIALIZAÇÃO (BUSCA DE DADOS E GEOLOCALIZAÇÃO) ---
  useEffect(() => {

    const requestLocationPermission = async () => {
      console.log("--- Iniciando pedido de permissão de localização ---");
      if (Platform.OS === 'android') {
        try {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
              title: "Permissão de Localização",
              message: "Este aplicativo precisa de acesso à sua localização para centralizar o mapa.",
              buttonPositive: "OK",
              buttonNegative: "Cancelar"
            }
          );
          console.log("Resultado da permissão:", granted);
          if (granted === PermissionsAndroid.RESULTS.GRANTED) {
            Geolocation.getCurrentPosition(
              (position) => {
                const { latitude, longitude } = position.coords;
                const userRegion: Region = { latitude, longitude, latitudeDelta: 0.0922, longitudeDelta: 0.0421 };
                // MUDANÇA 3: Em vez de setar um estado, nós animamos o mapa para a posição do usuário
                mapRef.current?.animateToRegion(userRegion, 1000); // Anima em 1 segundo
              },
              (error) => { console.log("Erro ao obter localização:", error.code, error.message); },
              { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
            )
          } else {
            console.log("Permissão de localização NEGADA pelo usuário.");
          };
        } catch (err) {
          console.warn(err);
        }
      }
    };

    // Chama as funções depois de defini-las
    fetchEcopontos();
    requestLocationPermission();
  }, []);

  const handleToggleList = () => {
    if (!isListVisible) {
      fetchNearbyPoints(); // Busca os pontos só quando abre a lista
    }
    setListVisible(!isListVisible); // Alterna a visibilidade da lista
  };

  // --- FUNÇÕES DE MANIPULAÇÃO DO MODAL E FORMULÁRIO ---
  const closeAndResetModal = () => {
    setEditingMarker(null);
    setFormCoordinate(null);
    setFormTitle('');
    setFormMaterials([]);
    setModalVisible(false);
  };

  const openEditModal = (marker: MarkerData) => {
    setEditingMarker(marker);
    setFormCoordinate({ latitude: marker.latitude, longitude: marker.longitude });
    setFormTitle(marker.title);
    setFormMaterials(marker.materials || []);
    setModalVisible(true);
  };

  const toggleMaterial = (material: string) => {
    setFormMaterials(prev => prev.includes(material) ? prev.filter(m => m !== material) : [...prev, material]);
  };

  const handleSave = () => {
    if (editingMarker) {
      handleUpdatePoint();
    } else {
      handleCreatePoint();
    }
  };

  const handleCreatePoint = async () => {
    if (formTitle.trim() === '' || !formCoordinate) { Alert.alert("Erro", "O nome do ponto é obrigatório."); return; }
    try {
      const response = await fetch(`${API_URL}/ecopontos`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: formTitle, latitude: formCoordinate.latitude, longitude: formCoordinate.longitude, materials: formMaterials }), });
      if (!response.ok) throw new Error('Falha ao criar o ponto.');
      const savedMarker: MarkerData = await response.json();
      setMarkers(prev => [...prev, savedMarker]);
      closeAndResetModal();
    } catch (error) { console.error(error); Alert.alert("Erro", "Não foi possível criar o ponto."); }
  };

  const handleUpdatePoint = async () => {
    if (!editingMarker) return;
    try {
      const response = await fetch(`${API_URL}/ecopontos/${editingMarker.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: formTitle, materials: formMaterials }), });
      if (!response.ok) throw new Error('Falha ao atualizar o ponto.');
      const updatedMarker: MarkerData = await response.json();
      setMarkers(prev => prev.map(m => (m.id === updatedMarker.id ? updatedMarker : m)));
      closeAndResetModal();
    } catch (error) { console.error(error); Alert.alert("Erro", "Não foi possível atualizar o ponto."); }
  };

  const handleDeletePoint = (id: number) => {
    Alert.alert("Confirmar Exclusão", "Você tem certeza que deseja deletar este ponto?",
      [{ text: "Cancelar", style: "cancel" }, {
        text: "Deletar", style: "destructive", onPress: async () => {
          try {
            const response = await fetch(`${API_URL}/ecopontos/${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Falha ao deletar o ponto no servidor.');
            setMarkers(prev => prev.filter(marker => marker.id !== id));
          } catch (error) { console.error(error); Alert.alert("Erro", "Não foi possível deletar o ponto."); }
        }
      }]
    );
  };

  // --- FUNÇÕES DE EVENTOS DO MAPA ---
  const handleMapPress = (event: MapPressEvent) => {
    const action = event.nativeEvent.action;
    if (action === 'marker-press' || action === 'callout-press') return;
    setEditingMarker(null);
    setFormCoordinate(event.nativeEvent.coordinate);
    setFormTitle('');
    setFormMaterials([]);
    setModalVisible(true);
  };

  const showMarkerActions = (marker: MarkerData) => {
    Alert.alert(marker.title, "O que você deseja fazer?",
      [
        { text: "Editar", onPress: () => openEditModal(marker) },
        { text: "Deletar", style: "destructive", onPress: () => handleDeletePoint(marker.id) },
        { text: "Cancelar", style: "cancel" },
      ]
    );
  };

  // --- RENDERIZAÇÃO ---
  return (
    <View style={styles.container}>
      {/* MUDANÇA 4: O Mapa agora é a base, e a lista é uma sobreposição */}
      <MapView
        ref={mapRef} // Conectamos a referência ao mapa
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={SAO_PAULO_REGION} // O mapa sempre carrega na região padrão
        onPress={handleMapPress}
      >
        {markers.map(marker => (
          <Marker key={marker.id} coordinate={{ latitude: marker.latitude, longitude: marker.longitude }}>
            <Callout onPress={() => showMarkerActions(marker)}>
              <View style={styles.calloutContainer}>
                <Text style={styles.calloutTitle}>{marker.title}</Text>
                <Text>{marker.materials ? marker.materials.join(', ') : 'Materiais não informados'}</Text>
                <Text style={styles.calloutActionText}>Toque para ver as opções</Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>
      {/* Botão para abrir/fechar a lista de pontos */}
      <Pressable style={styles.listToggleButton} onPress={handleToggleList}>
        <Text style={styles.listToggleButtonText}>{isListVisible ? 'Fechar Lista' : 'Ver Lista'}</Text>
      </Pressable>

      {/* A lista agora é uma sobreposição que aparece quando isListVisible é true */}
      {isListVisible && (
        <View style={styles.listOverlay}>
          {isLoadingList ? (
            <ActivityIndicator size="large" />
          ) : (
            <FlatList
              data={nearbyPoints}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <View style={styles.listItem}>
                  <Text style={styles.listTitle}>{item.title}</Text>
                  <Text style={styles.listMaterials}>{item.materials.join(', ')}</Text>
                  <Text style={styles.listDistance}>{item.distance.toFixed(2)} km de distância</Text>
                </View>
              )}
              ListEmptyComponent={<View><Text>Nenhum ponto de coleta encontrado.</Text></View>}
            />
          )}
        </View>
      )}
      <Modal visible={isModalVisible} onRequestClose={closeAndResetModal} transparent={true} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>{editingMarker ? 'Editar Ponto de Coleta' : 'Adicionar Novo Ponto'}</Text>
            <TextInput style={styles.input} placeholder="Nome do Ponto" value={formTitle} onChangeText={setFormTitle} />
            <Text style={styles.materialsLabel}>Materiais Aceitos:</Text>
            <View style={styles.materialsContainer}>
              {MATERIAL_TYPES.map(material => (
                <Pressable key={material} style={[styles.materialButton, formMaterials.includes(material) && styles.materialButtonSelected]} onPress={() => toggleMaterial(material)}>
                  <Text style={[styles.materialButtonText, formMaterials.includes(material) && styles.materialButtonTextSelected]}>{material}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.buttonContainer}>
              <Button title="Cancelar" onPress={closeAndResetModal} color="#f44336" />
              <Button title="Salvar" onPress={handleSave} />
            </View>
          </View>
        </View>
      </Modal>
    </View >
  );
}

// ESTILOS ATUALIZADOS
const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { ...StyleSheet.absoluteFillObject },
  // Estilo para o botão de abrir a lista
  listToggleButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    backgroundColor: 'white',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
    elevation: 5, // Sombra no Android
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  listToggleButtonText: {
    fontWeight: 'bold',
    color: '#007bff'
  },

  // Estilo para a sobreposição da lista
  listOverlay: {
    position: 'absolute',
    top: 120,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#f0f0f0',
    padding: 10,
  },

  listItem: { backgroundColor: '#fff', padding: 15, marginBottom: 10, borderRadius: 8 },
  listTitle: { fontSize: 18, fontWeight: 'bold' },
  listMaterials: { fontSize: 14, color: 'gray', marginTop: 5 },
  listDistance: { fontSize: 14, color: '#007bff', marginTop: 8, fontWeight: 'bold' },
  calloutContainer: { width: 220, padding: 5 },
  calloutTitle: { fontWeight: 'bold', fontSize: 16, marginBottom: 5 },
  calloutActionText: { marginTop: 8, color: '#007bff', fontSize: 13, textAlign: 'center', fontWeight: 'bold' },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  modalView: { width: '90%', backgroundColor: 'white', borderRadius: 20, padding: 20, alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  input: { height: 40, borderColor: 'gray', borderWidth: 1, borderRadius: 5, marginBottom: 15, width: '100%', paddingHorizontal: 10 },
  materialsLabel: { fontWeight: 'bold', marginBottom: 10, alignSelf: 'flex-start' },
  materialsContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', marginBottom: 20, width: '100%' },
  materialButton: { paddingHorizontal: 12, paddingVertical: 8, margin: 4, backgroundColor: '#eee', borderRadius: 15, borderWidth: 1, borderColor: '#ddd' },
  materialButtonSelected: { backgroundColor: '#007bff', borderColor: '#007bff' },
  materialButtonText: { color: '#333' },
  materialButtonTextSelected: { color: 'white' },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-around', width: '100%' },
});

export default App;