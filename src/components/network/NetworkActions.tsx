import {
  CloseOutlined,
  ExportOutlined,
  FormOutlined,
  MoreOutlined,
  PlayCircleOutlined,
  StopOutlined,
  ToolOutlined,
  WarningOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import styled from '@emotion/styled';
import { Button, Divider, Dropdown, MenuProps, Tag } from 'antd';
import { ButtonType } from 'antd/lib/button';
import AutoMineButton from 'components/designer/AutoMineButton';
import { useMiningAsync } from 'hooks/useMiningAsync';
import SyncButton from 'components/designer/SyncButton';
import { usePrefixedTranslation } from 'hooks';
import React, { ReactNode, useCallback } from 'react';
import { Status } from 'shared/types';
import { useStoreState, useStoreActions } from 'store';
import { Network } from 'types';
import { getNetworkBackendId } from 'utils/network';

const Styled = {
  Button: styled(Button)`
    margin-left: 0;
  `,
  Dropdown: styled(Dropdown)`
    margin-left: 12px;
  `,
};

interface Props {
  network: Network;
  onClick: () => void;
  onRenameClick: () => void;
  onDeleteClick: () => void;
  onExportClick: () => void;
}

const config: {
  [key: number]: {
    label: string;
    type: ButtonType;
    danger?: boolean;
    icon: ReactNode;
  };
} = {
  [Status.Starting]: {
    label: 'Starting',
    type: 'primary',
    icon: '',
  },
  [Status.Started]: {
    label: 'Stop',
    type: 'primary',
    danger: true,
    icon: <StopOutlined />,
  },
  [Status.Stopping]: {
    label: 'Stopping',
    type: 'default',
    icon: '',
  },
  [Status.Stopped]: {
    label: 'Start',
    type: 'primary',
    icon: <PlayCircleOutlined />,
  },
  [Status.Error]: {
    label: 'Restart',
    type: 'primary',
    danger: true,
    icon: <WarningOutlined />,
  },
};

const NetworkActions: React.FC<Props> = ({
  network,
  onClick,
  onRenameClick,
  onDeleteClick,
  onExportClick,
}) => {
  const { l } = usePrefixedTranslation('cmps.network.NetworkActions');

  const { status, nodes } = network;
  const bitcoinNode = nodes.bitcoin[0];
  const loading = status === Status.Starting || status === Status.Stopping;
  const started = status === Status.Started;
  const { label, type, danger, icon } = config[status];

  const nodeState = useStoreState(
    s => s.bitcoind.nodes[getNetworkBackendId(bitcoinNode)],
  );

  const mineAsync = useMiningAsync(network);
  const { showNetworkMonitoring } = useStoreActions(s => s.modals); //verify

  const handleClick: MenuProps['onClick'] = useCallback((info: { key: string }) => {
    switch (info.key) {
      case 'rename':
        onRenameClick();
        break;
      case 'export':
        onExportClick();
        break;
      case 'delete':
        onDeleteClick();
        break;
    }
  }, []);

  const items: MenuProps['items'] = [
    { key: 'rename', label: l('menuRename'), icon: <FormOutlined /> },
    { key: 'export', label: l('menuExport'), icon: <ExportOutlined /> },
    { key: 'delete', label: l('menuDelete'), icon: <CloseOutlined /> },
  ];

  // Helper to stop monitoring before stopping the network
  const stopMonitoringIfNeeded = async () => {
    const port = `39${network.id.toString().padStart(3, '0')}`;
    try {
      // Always try to stop monitoring before stopping network
      await fetch(`http://localhost:${port}/stop`, { method: 'GET', mode: 'no-cors' });
    } catch {
      // Ignore errors (monitoring might not be running)
    }
  };

  // Wrap the onClick handler for stopping/restarting the network
  const handlePrimaryClick = async () => {
    if (status === Status.Started || status === Status.Error) {
      await stopMonitoringIfNeeded();
    }
    onClick();
  };

  return (
    <>
      {bitcoinNode.status === Status.Started && nodeState?.chainInfo && (
        <>
          <Tag>height: {nodeState.chainInfo.blocks}</Tag>
          <Button
            onClick={mineAsync.execute}
            loading={mineAsync.loading}
            icon={<ToolOutlined />}
          >
            {l('mineBtn')}
          </Button>
          <AutoMineButton network={network} />
          <SyncButton network={network} />
          <Button
            icon={<EyeOutlined />}
            onClick={() => showNetworkMonitoring({ networkId: network.id })}
            style={{ marginLeft: '9px' }}
          >
            {/* {l('monitorNetworkBtn')} need to add the translation */}
            monitoring button
          </Button>
          <Divider type="vertical" />
        </>
      )}
      <Styled.Button
        key="start"
        type={type}
        danger={danger}
        icon={icon}
        loading={loading}
        ghost={started}
        onClick={handlePrimaryClick}
      >
        {l(`primaryBtn${label}`)}
      </Styled.Button>
      <Styled.Dropdown
        key="options"
        menu={{ theme: 'dark', items, onClick: handleClick }}
      >
        <Button icon={<MoreOutlined />} />
      </Styled.Dropdown>
    </>
  );
};

export default NetworkActions;
