import React, { useEffect, useState } from 'react';
import { Modal, Typography, Button, Input, Form, Select } from 'antd'; // Import Input, Form, and Select components
import ReactJson from 'react-json-view'; // Import ReactJson
//import { usePrefixedTranslation } from 'hooks';
import { useStoreActions, useStoreState } from 'store';

const { Text, Title } = Typography;
const fs = window.require('fs');
const path = window.require('path');

interface NetworkMonitoringModalProps {
  networkId: number; // Add networkId as a prop
}

const fetchJsonData = async (
  setJsonData: React.Dispatch<React.SetStateAction<any>>,
  networkId: number, // Accept networkId as a parameter
) => {
  const jsonFilePath = path.join(
    `C:/Users/Oriol/.polar/networks/${networkId}/volumes/shared_data/output.json`, // Use dynamic networkId
  );

  if (fs.existsSync(jsonFilePath)) {
    // File exists, proceed to read and parse it
    const fileContent = fs.readFileSync(jsonFilePath, 'utf-8');
    const data = JSON.parse(fileContent);
    setJsonData(data);
  } else {
    setJsonData(null);
  }
};

const packetTypeOptions = ['TCP', 'UDP', 'ICMP', 'ARP']; // Predefined packet types

const renderJsonData = (
  data: any,
  expandedState: boolean[],
  toggleExpanded: (index: number) => void,
) => {
  if (!Array.isArray(data)) return <Text type="secondary">No data available</Text>;

  return (
    <div
      style={{
        maxHeight: '50vh',
        overflowY: 'auto',
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '10px',
        background: '#1f1f1f', // Match modal background
      }}
    >
      {data.map((item: any, index: number) => {
        const layers = item?._source?.layers || {};
        const summary = {
          utcTime: layers?.frame?.['frame.time'] || 'N/A',
          srcIp: layers?.ip?.['ip.src'] || 'N/A',
          dstIp: layers?.ip?.['ip.dst'] || 'N/A',
          messageType: layers?.frame?.['frame.protocols']?.split(':').pop() || 'N/A',
          packetSize: layers?.frame?.['frame.len'] || 'N/A', // Add packet size
        };

        return (
          <div
            key={index}
            style={{
              marginBottom: '10px',
              border: '1px solid #ccc',
              borderRadius: '5px',
              padding: '10px',
              background: '#2d2d2d', // Slightly lighter background for each item
            }}
          >
            <div
              style={{
                cursor: 'pointer',
                fontWeight: 'bold',
                color: '#1890ff',
              }}
              onClick={() => toggleExpanded(index)}
            >
              {expandedState[index] ? '▼' : '▶'}{' '}
              <span style={{ color: '#ffcc00' }}>UTC Time:</span>{' '}
              <span style={{ color: '#f0f0f0', fontWeight: 'normal' }}>
                {summary.utcTime}
              </span>
              , <span style={{ color: '#ffcc00' }}>Src IP:</span>{' '}
              <span style={{ color: '#66ff66', fontWeight: 'normal' }}>
                {summary.srcIp}
              </span>
              , <span style={{ color: '#ffcc00' }}>Dst IP:</span>{' '}
              <span style={{ color: '#66ccff', fontWeight: 'normal' }}>
                {summary.dstIp}
              </span>
              , <span style={{ color: '#ffcc00' }}>Message Type:</span>{' '}
              <span style={{ color: '#ff9966', fontWeight: 'normal' }}>
                {summary.messageType}
              </span>
              , <span style={{ color: '#ffcc00' }}>Packet Size:</span>{' '}
              <span style={{ color: '#f0f0f0', fontWeight: 'normal' }}>
                {summary.packetSize}
              </span>
            </div>
            {expandedState[index] && (
              <div
                style={{
                  marginTop: '10px',
                  background: '#1f1f1f', // Match modal background
                  padding: '10px',
                  borderRadius: '5px',
                  overflowX: 'auto',
                }}
              >
                <ReactJson
                  src={item}
                  collapsed={3} // Collapse nodes at the fourth level onwards
                  enableClipboard={true} // Allow copying to clipboard
                  theme={{
                    base00: '#1f1f1f', // Match modal background
                    base01: '#2d2d2d', // Slightly lighter background for nested elements
                    base02: '#3c3c3c', // Borders
                    base03: '#c5c5c5', // Comments, keys (light gray)
                    base04: '#f0f0f0', // Strings (white)
                    base05: '#ffcc00', // Numbers (yellow)
                    base06: '#ff6666', // Booleans (red)
                    base07: '#66ff66', // Null (green)
                    base08: '#66ccff', // Undefined (blue)
                    base09: '#ff9966', // Additional color for customization (orange)
                    base0A: '#ff66ff', // Additional color for customization (pink)
                    base0B: '#66ffff', // Additional color for customization (cyan)
                    base0C: '#ffff66', // Additional color for customization (light yellow)
                    base0D: '#cc99ff', // Additional color for customization (purple)
                    base0E: '#99ccff', // Additional color for customization (light blue)
                    base0F: '#999999', // Additional color for customization (gray)
                  }} // Custom theme for dark background
                  displayDataTypes={false} // Hide data types for cleaner display
                  name={false} // Hide the root key
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const NetworkMonitoringModal: React.FC<NetworkMonitoringModalProps> = ({ networkId }) => {
  //const { l } = usePrefixedTranslation('cmps.network.NetworkMonitoringModal');
  const { visible } = useStoreState(s => s.modals.networkMonitoring);
  const { hideNetworkMonitoring } = useStoreActions(s => s.modals);

  const [jsonData, setJsonData] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false); // Track start/stop state
  const [isButtonDisabled, setIsButtonDisabled] = useState(false); // Disable button while waiting for response
  const [isConfigMode, setIsConfigMode] = useState(false); // Track if in configuration mode
  const [config, setConfig] = useState({
    ip: '',
    port: '',
    packetType: '',
    protocol: '',
    sourceIp: '',
    destinationIp: '',
    sourcePort: '',
    destinationPort: '',
    packetSizeMin: '',
    packetSizeMax: '',
    timeRange: '',
    tcpFlags: '',
    payloadContent: '',
    macAddress: '',
  }); // Store configuration fields
  const [expandedState, setExpandedState] = useState<boolean[]>([]);

  useEffect(() => {
    if (visible) {
      fetchJsonData(setJsonData, networkId); // Pass networkId to fetchJsonData
    }
  }, [visible, networkId]);

  useEffect(() => {
    if (jsonData && Array.isArray(jsonData)) {
      setExpandedState(new Array(jsonData.length).fill(false)); // Initialize expanded state for all items
    }
  }, [jsonData]);

  const handleButtonClick = async () => {
    setIsButtonDisabled(true); // Disable button
    const url = isRunning ? 'http://localhost:5007/stop' : 'http://localhost:5007/start';

    try {
      const response = await fetch(url, { method: 'GET', mode: 'no-cors' }); // Set mode to 'no-cors'
      if (response.ok || response.type === 'opaque') {
        console.log('State toggled successfully');
        if (isRunning) {
          // Stop mode: Reload JSON data
          await fetchJsonData(setJsonData, networkId);
        } else {
          // Start mode: Clear JSON data
          setJsonData(null);
        }
        setIsRunning(!isRunning); // Toggle state on success
      } else {
        console.error('Failed to toggle state:', response.statusText);
      }
    } catch (error) {
      console.error('Error during request:', error);
    } finally {
      setIsButtonDisabled(false); // Re-enable button
    }
  };

  const handleConfigChange = (field: string, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handlePacketTypeChange = (values: string[]) => {
    setConfig(prev => ({ ...prev, packetType: values.join(', ') })); // Store selected packet types as a comma-separated string
  };

  const toggleExpanded = (index: number) => {
    setExpandedState(prevState => {
      const newState = [...prevState];
      newState[index] = !newState[index];
      return newState;
    });
  };

  const isTcpSelected = config.packetType.split(', ').includes('TCP'); // Check if TCP is selected
  const isUdpSelected = config.packetType.split(', ').includes('UDP'); // Check if UDP is selected

  return (
    <Modal
      //title={l('title')}
      title={'Network Monitoring'}
      open={visible}
      onCancel={() => hideNetworkMonitoring()}
      footer={null}
      destroyOnClose
      width={'80%'}
      style={{ maxHeight: '100vh', overflowY: 'auto' }} // Use viewport height for consistency
    >
      <Title level={4}>{isConfigMode ? 'Configuration' : 'Monitoring modal'}</Title>
      <Text>
        {isConfigMode
          ? 'Define your configuration settings below.'
          : 'Monitoring Description'}
      </Text>
      <div style={{ marginTop: 20, display: 'flex', gap: '10px' }}>
        <Button
          type="primary"
          onClick={handleButtonClick}
          disabled={isButtonDisabled} // Disable button while waiting for response
        >
          {isRunning ? 'Stop' : 'Start'}
        </Button>
        <Button
          type="default"
          onClick={() => setIsConfigMode(!isConfigMode)} // Toggle configuration mode
        >
          {isConfigMode ? 'Back to Monitoring' : 'Configuration'}
        </Button>
      </div>
      <div style={{ marginTop: 20 }}>
        {isConfigMode ? (
          <Form layout="vertical">
            <Form.Item label="IP Address">
              <Input
                value={config.ip}
                onChange={e => handleConfigChange('ip', e.target.value)}
                placeholder="Enter IP Address"
              />
            </Form.Item>
            <Form.Item label="Port">
              <Input
                value={config.port}
                onChange={e => handleConfigChange('port', e.target.value)}
                placeholder="Enter Port"
              />
            </Form.Item>
            <Form.Item label="Packet Type">
              <Select
                mode="multiple" // Allow multiple selections
                allowClear
                placeholder="Select or enter packet types"
                value={config.packetType ? config.packetType.split(', ') : []} // Ensure no empty option is selected
                onChange={handlePacketTypeChange}
                options={packetTypeOptions.map(type => ({ value: type, label: type }))}
              />
            </Form.Item>
            <Form.Item label="Protocol">
              <Input
                value={config.protocol}
                onChange={e => handleConfigChange('protocol', e.target.value)}
                placeholder="Enter Protocol (e.g., TCP, UDP)"
              />
            </Form.Item>
            <Form.Item label="Source IP">
              <Input
                value={config.sourceIp}
                onChange={e => handleConfigChange('sourceIp', e.target.value)}
                placeholder="Enter Source IP"
              />
            </Form.Item>
            <Form.Item label="Destination IP">
              <Input
                value={config.destinationIp}
                onChange={e => handleConfigChange('destinationIp', e.target.value)}
                placeholder="Enter Destination IP"
              />
            </Form.Item>
            <Form.Item label="Source Port">
              <Input
                value={config.sourcePort}
                onChange={e => handleConfigChange('sourcePort', e.target.value)}
                placeholder="Enter Source Port"
              />
            </Form.Item>
            <Form.Item label="Destination Port">
              <Input
                value={config.destinationPort}
                onChange={e => handleConfigChange('destinationPort', e.target.value)}
                placeholder="Enter Destination Port"
              />
            </Form.Item>
            <Form.Item label="Packet Size (Min)">
              <Input
                value={config.packetSizeMin}
                onChange={e => handleConfigChange('packetSizeMin', e.target.value)}
                placeholder="Enter Minimum Packet Size"
              />
            </Form.Item>
            <Form.Item label="Packet Size (Max)">
              <Input
                value={config.packetSizeMax}
                onChange={e => handleConfigChange('packetSizeMax', e.target.value)}
                placeholder="Enter Maximum Packet Size"
              />
            </Form.Item>
            <Form.Item label="Time Range">
              <Input
                value={config.timeRange}
                onChange={e => handleConfigChange('timeRange', e.target.value)}
                placeholder="Enter Time Range"
              />
            </Form.Item>
            {isTcpSelected && (
              <Form.Item label="TCP Flags">
                <Input
                  value={config.tcpFlags}
                  onChange={e => handleConfigChange('tcpFlags', e.target.value)}
                  placeholder="Enter TCP Flags (e.g., SYN, ACK)"
                />
              </Form.Item>
            )}
            {isUdpSelected && (
              <Form.Item label="Payload Content">
                <Input
                  value={config.payloadContent}
                  onChange={e => handleConfigChange('payloadContent', e.target.value)}
                  placeholder="Enter Payload Content"
                />
              </Form.Item>
            )}
            <Form.Item label="MAC Address">
              <Input
                value={config.macAddress}
                onChange={e => handleConfigChange('macAddress', e.target.value)}
                placeholder="Enter MAC Address"
              />
            </Form.Item>
          </Form>
        ) : jsonData ? (
          renderJsonData(jsonData, expandedState, toggleExpanded) // Pass expanded state and toggle function
        ) : (
          <Text type="secondary">Loading JSON data...</Text>
        )}
      </div>
    </Modal>
  );
};

export default NetworkMonitoringModal;
