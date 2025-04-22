import React from 'react';
import { Modal, Typography } from 'antd';
import { usePrefixedTranslation } from 'hooks';
import { useStoreActions, useStoreState } from 'store';

const { Text, Title } = Typography;

const NetworkMonitoringModal: React.FC = () => {
  const { l } = usePrefixedTranslation('cmps.network.NetworkMonitoringModal');
  const { visible } = useStoreState(s => s.modals.networkMonitoring);
  const { hideNetworkMonitoring } = useStoreActions(s => s.modals);
  console.log('NetworkMonitoringModal visible:', visible); // Debugging log

  return (
    <Modal
      title={l('title')}
      open={visible}
      onCancel={() => hideNetworkMonitoring()}
      footer={null}
      destroyOnClose
    >
      <Title level={4}>{l('monitoringTitle', { network: 'Network 1' })}</Title>
      <Text>{l('monitoringDescription', { network: 'Network 1' })}</Text>
      <div style={{ marginTop: 20 }}>
        <Text type="secondary">
          This is a placeholder for network monitoring content.
        </Text>
      </div>
    </Modal>
  );
};

export default NetworkMonitoringModal;
