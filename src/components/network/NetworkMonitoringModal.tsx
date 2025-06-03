import React, { useEffect, useState, useRef } from 'react';
import { Modal, Typography, Button, Input, Form, Select, Alert, Pagination } from 'antd'; // <-- Add Alert
import ReactJson from 'react-json-view'; // Import ReactJson
//import { usePrefixedTranslation } from 'hooks';
import { useStoreActions, useStoreState } from 'store';
import { networksPath } from 'utils/config';

const { Text, Title } = Typography;
const fs = window.require('fs');
const path = window.require('path');
const electron = window.require('electron');
const { dialog } = electron.remote || electron;

interface NetworkMonitoringModalProps {
  networkId: number; // Add networkId as a prop
}

// Helper to get the correct JSON file path
const getJsonFilePath = (networkId: number, configExists: boolean) => {
  const base = path.join(networksPath, networkId.toString(), 'volumes', 'shared_data');
  return configExists ? path.join(base, 'filtered.json') : path.join(base, 'output.json');
};

// Helper to get the correct PCAP file path and name
const getPcapFileInfo = (networkId: number, configExists: boolean) => {
  const base = path.join(networksPath, networkId.toString(), 'volumes', 'shared_data');
  if (configExists) {
    const pcapPath = path.join(base, 'filtered.pcap');
    if (fs.existsSync(pcapPath)) return { path: pcapPath, name: 'filtered.pcap' };
  }
  const pcapPath = path.join(base, 'merged.pcap');
  if (fs.existsSync(pcapPath)) return { path: pcapPath, name: 'merged.pcap' };
  return null;
};

const fetchJsonData = async (
  setJsonData: React.Dispatch<React.SetStateAction<any>>,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  networkId: number,
  configExists: boolean,
  isMountedRef?: React.MutableRefObject<boolean>,
) => {
  setLoading(true);
  const jsonFilePath = getJsonFilePath(networkId, configExists);
  if (fs.existsSync(jsonFilePath)) {
    const fileContent = fs.readFileSync(jsonFilePath, 'utf-8');
    let parsed;
    try {
      parsed = JSON.parse(fileContent);
    } catch {
      parsed = null;
    }
    if (!isMountedRef || isMountedRef.current) {
      setJsonData(parsed);
      setLoading(false);
    }
  } else {
    if (!isMountedRef || isMountedRef.current) {
      setJsonData(null);
      setLoading(false);
    }
  }
};

const configFilePath = (networkId: number) =>
  path.join(networksPath, networkId.toString(), 'volumes', 'shared_data', 'config.json');

const checkConfigExists = (networkId: number) => {
  return fs.existsSync(configFilePath(networkId));
};

const loadConfigFromFile = (networkId: number) => {
  try {
    const filePath = configFilePath(networkId);
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(fileContent);
    }
  } catch (err) {
    console.error('Failed to load config.json:', err);
  }
  return null;
};

const packetTypeOptions = ['tcp', 'udp', 'icmp', 'arp']; // Predefined packet types

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

const extractTsharkError = (msg: string): string => {
  // Find the part after "tshark:"
  const tsharkIdx = msg.indexOf('tshark:');
  if (tsharkIdx === -1) return msg;
  let error = msg.slice(tsharkIdx + 7).trim();
  // Remove anything after a line that starts with "(" (the filter expression)
  const filterIdx = error.search(/\(.*\)\s*\^/);
  if (filterIdx !== -1) {
    error = error.slice(0, filterIdx).trim();
  }
  // Remove trailing lines after a newline if present
  const newlineIdx = error.indexOf('\n');
  if (newlineIdx !== -1) {
    error = error.slice(0, newlineIdx).trim();
  }
  return error;
};

const NetworkMonitoringModal: React.FC<NetworkMonitoringModalProps> = ({ networkId }) => {
  //const { l } = usePrefixedTranslation('cmps.network.NetworkMonitoringModal');
  const { visible } = useStoreState(s => s.modals.networkMonitoring);
  const { hideNetworkMonitoring } = useStoreActions(s => s.modals);
  const network = useStoreState(s => {
    try {
      return s.network.networkById?.(networkId);
    } catch {
      return undefined;
    }
  });

  const [jsonData, setJsonData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isRunning, setIsRunning] = useState(false); // Track start/stop state
  const [isConfigMode, setIsConfigMode] = useState(false); // Track if in configuration mode
  const [config, setConfig] = useState({
    ip: '',
    port: '',
    protocol: '', // use protocol only
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
  const [configExists, setConfigExists] = useState(false);
  const [isBusy, setIsBusy] = useState(false); // Unified busy state
  const [configErrorMsg, setConfigErrorMsg] = useState<string | null>(null);

  // Track which PCAP file is being used
  const [pcapFileName, setPcapFileName] = useState<string | null>(null);

  // Ref to track the previous value of isConfigMode
  const prevConfigMode = useRef(false);

  // Ref to track if component is mounted
  const isMountedRef = useRef(true);
  const networkStatus = network?.status;

  useEffect(() => {
    if (!network && visible) {
      hideNetworkMonitoring();
    }
  }, [network, visible, hideNetworkMonitoring]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Always check config and load files together when modal is opened
  useEffect(() => {
    if (visible) {
      const configNowExists = checkConfigExists(networkId);
      setConfigExists(configNowExists);
      fetchJsonData(setJsonData, setLoading, networkId, configNowExists, isMountedRef);
      const pcapInfo = getPcapFileInfo(networkId, configNowExists);
      setPcapFileName(pcapInfo ? pcapInfo.name : null);
    }
    // Optionally, clear data when modal closes
    if (!visible) {
      setJsonData(null);
      setExpandedState([]);
    }
  }, [visible, networkId]);

  useEffect(() => {
    if (Array.isArray(jsonData)) {
      setExpandedState(new Array(jsonData.length).fill(false));
      setPage(1); // Reset to first page when data changes
    }
  }, [jsonData]);

  useEffect(() => {
    // Only load config from file when entering config mode
    if (isConfigMode && !prevConfigMode.current) {
      if (configExists) {
        const loaded = loadConfigFromFile(networkId);
        if (loaded) setConfig({ ...config, ...loaded });
      } else {
        setConfig({
          ip: '',
          port: '',
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
        });
      }
    }
    prevConfigMode.current = isConfigMode;
  }, [isConfigMode, configExists, networkId]);

  // Sync isRunning with network status: if network is stopped, monitoring must be stopped
  useEffect(() => {
    if (networkStatus === 3 /* Status.Stopped */ && isRunning) {
      setIsRunning(false);
    }
  }, [networkStatus, isRunning]);

  const handleStartStop = async () => {
    setIsBusy(true);
    const port = `39${networkId.toString().padStart(3, '0')}`; // Dynamically calculate port
    const url = isRunning
      ? `http://localhost:${port}/stop` // Stop command
      : `http://localhost:${port}/start`; // Start command

    try {
      const response = await fetch(url, { method: 'GET', mode: 'no-cors' }); // Set mode to 'no-cors'
      if (response.ok || response.type === 'opaque') {
        console.log('State toggled successfully');
        if (isRunning) {
          // Stop mode: Reload JSON data
          await fetchJsonData(setJsonData, setLoading, networkId, configExists);
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
      setIsBusy(false);
    }
  };

  const handleSaveConfig = async () => {
    setIsBusy(true);
    setConfigErrorMsg(null);
    const port = `39${networkId.toString().padStart(3, '0')}`;
    const url = `http://localhost:${port}/config`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (response.status === 422) {
        const data = await response.json();
        let errorMsg = data?.error || 'Configuration saved but filtering failed';
        errorMsg = extractTsharkError(errorMsg);
        setConfigErrorMsg(errorMsg);
        setConfigExists(true);
        fetchJsonData(setJsonData, setLoading, networkId, false, isMountedRef);
      } else if (response.ok) {
        setConfigErrorMsg(null);
        setConfigExists(true);
        fetchJsonData(setJsonData, setLoading, networkId, true, isMountedRef);
      } else {
        console.error('Failed to save configuration:', response.statusText);
      }
    } catch (error) {
      console.error('Error during configuration save:', error);
    } finally {
      setIsBusy(false);
    }
  };

  const handleClearConfig = async () => {
    setIsBusy(true);
    const port = `39${networkId.toString().padStart(3, '0')}`;
    const url = `http://localhost:${port}/cleanConf`;
    try {
      const response = await fetch(url, { method: 'GET' });
      if (response.ok) {
        console.log('Configuration and filtered files cleaned.');
        setConfigExists(false);
        // Reload JSON data after config is cleared
        fetchJsonData(setJsonData, setLoading, networkId, false, isMountedRef);
      } else {
        console.error('Failed to clean configuration:', response.statusText);
      }
    } catch (error) {
      console.error('Error during configuration clean:', error);
    } finally {
      // Always clear the form fields, regardless of fetch result
      setConfig({
        ip: '',
        port: '',
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
      });
      setIsBusy(false);
    }
  };

  const handleConfigChange = (field: string, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  // Helper: get selected types as lowercase array from protocol
  const selectedTypes = config.protocol
    ? config.protocol.split(',').map(t => t.trim().toLowerCase())
    : [];

  const isTcpSelected = selectedTypes.includes('tcp');
  const isUdpSelected = selectedTypes.includes('udp');
  const isPortRelevant = isTcpSelected || isUdpSelected;

  const toggleExpanded = (index: number) => {
    setExpandedState(prevState => {
      const newState = [...prevState];
      newState[index] = !prevState[index];
      return newState;
    });
  };

  // Store Monitoring handler
  const handleStoreMonitoring = async () => {
    const pcapInfo = getPcapFileInfo(networkId, configExists);
    if (!pcapInfo) {
      dialog.showErrorBox(
        'No PCAP file found',
        'There is no filtered.pcap or merged.pcap to store.',
      );
      return;
    }
    const result = await dialog.showSaveDialog({
      title: 'Save Monitoring PCAP',
      defaultPath: pcapInfo.name,
      filters: [{ name: 'PCAP Files', extensions: ['pcap'] }],
    });
    if (!result.canceled && result.filePath) {
      try {
        fs.copyFileSync(pcapInfo.path, result.filePath);
        dialog.showMessageBox({
          message: 'PCAP file saved successfully.',
          buttons: ['OK'],
        });
      } catch (err) {
        dialog.showErrorBox('Error', 'Failed to save the PCAP file.');
      }
    }
  };

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);

  // Pagination logic for JSON data
  const paginatedJsonData = Array.isArray(jsonData)
    ? jsonData.slice((page - 1) * pageSize, page * pageSize)
    : jsonData;

  // Place the guard here, after all hooks
  if (!network) {
    return null;
  }

  return (
    <Modal
      //title={l('title')}
      title={'Network Packet Monitoring'}
      open={visible}
      onCancel={() => hideNetworkMonitoring()}
      footer={null}
      destroyOnClose
      width={'80%'}
      bodyStyle={{
        maxHeight: '80vh',
        overflowY: 'auto',
      }}
    >
      <Title level={4}>
        {isConfigMode ? 'Packet Filter Configuration' : 'Packet Monitoring'}
      </Title>
      <Text>
        {isConfigMode
          ? 'Configure packet capture filters and monitoring options.'
          : pcapFileName
          ? 'using the base file: ' + pcapFileName
          : 'View captured network packets and details.'}
      </Text>
      <div style={{ marginTop: 20, display: 'flex', gap: '10px' }}>
        {!isConfigMode && (
          <>
            <Button type="primary" onClick={handleStartStop} disabled={isBusy}>
              {isRunning ? 'Stop' : 'Start'}
            </Button>
            <Button type="default" onClick={handleStoreMonitoring} disabled={isBusy}>
              Store Monitoring
            </Button>
          </>
        )}
        <Button
          type="default"
          onClick={() => setIsConfigMode(!isConfigMode)} // Toggle configuration mode
          disabled={isBusy}
        >
          {isConfigMode ? 'Back to Monitoring' : 'Configuration'}
        </Button>
        {isConfigMode && (
          <>
            <Button
              type="primary"
              onClick={handleSaveConfig} // Save configuration changes
              disabled={isBusy}
            >
              Save Configuration
            </Button>
            {configExists && (
              <Button type="default" danger onClick={handleClearConfig} disabled={isBusy}>
                Clear Configuration
              </Button>
            )}
          </>
        )}
      </div>
      <div style={{ marginTop: 20 }}>
        {isConfigMode ? (
          <>
            {configErrorMsg && (
              <Alert
                message={`Configuration saved but filtering failed: ${configErrorMsg}`}
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}
            <Form layout="vertical">
              <Form.Item label="IP Address">
                <Input
                  value={config.ip}
                  onChange={e => handleConfigChange('ip', e.target.value)}
                  placeholder="Enter IP Address"
                />
              </Form.Item>
              {/* Only show Port if TCP or UDP is selected */}
              {isPortRelevant && (
                <Form.Item label="Port">
                  <Input
                    value={config.port}
                    onChange={e => handleConfigChange('port', e.target.value)}
                    placeholder="Enter Port"
                  />
                </Form.Item>
              )}
              <Form.Item label="Protocol">
                <Select
                  mode="multiple"
                  allowClear
                  placeholder="Select or enter protocol types"
                  value={config.protocol ? config.protocol.split(', ') : []}
                  onChange={(values: string[]) =>
                    handleConfigChange('protocol', values.join(', '))
                  }
                  options={packetTypeOptions.map(type => ({ value: type, label: type }))}
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
              {/* Only show Source/Destination Port if TCP or UDP is selected */}
              {isPortRelevant && (
                <>
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
                      onChange={e =>
                        handleConfigChange('destinationPort', e.target.value)
                      }
                      placeholder="Enter Destination Port"
                    />
                  </Form.Item>
                </>
              )}
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
              {/* Only show TCP Flags if TCP is selected */}
              {isTcpSelected && (
                <Form.Item label="TCP Flags">
                  <Input
                    value={config.tcpFlags}
                    onChange={e => handleConfigChange('tcpFlags', e.target.value)}
                    placeholder="Enter TCP Flags (e.g., SYN, ACK)"
                  />
                </Form.Item>
              )}
              {/* Only show Payload Content if UDP is selected */}
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
          </>
        ) : loading ? (
          <Text type="secondary">Loading captured packet data...</Text>
        ) : Array.isArray(jsonData) ? (
          jsonData.length === 0 ? (
            <Alert
              message="No packets match the current filter settings."
              type="warning"
              showIcon
              style={{ marginTop: 16 }}
            />
          ) : (
            <>
              <div
                style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <span>Page size:</span>
                <Select
                  value={pageSize}
                  style={{ width: 100 }}
                  onChange={val => setPageSize(val)}
                  options={[50, 100, 500, 1000].map(size => ({
                    value: size,
                    label: size,
                  }))}
                />
                <span style={{ marginLeft: 'auto' }}>{jsonData.length} packets</span>
              </div>
              {renderJsonData(paginatedJsonData, expandedState, toggleExpanded)}
              <Pagination
                current={page}
                pageSize={pageSize}
                total={jsonData.length}
                onChange={setPage}
                showSizeChanger={false}
                style={{ marginTop: 12, textAlign: 'center' }}
              />
            </>
          )
        ) : isRunning ? (
          <Alert
            message="Monitoring is active. Captured packets will appear here."
            type="info"
            showIcon
            style={{ marginTop: 16 }}
          />
        ) : (
          <Alert
            message="No packet data available. Start monitoring to capture packets."
            type="warning"
            showIcon
            style={{ marginTop: 16 }}
          />
        )}
      </div>
    </Modal>
  );
};

export default NetworkMonitoringModal;
