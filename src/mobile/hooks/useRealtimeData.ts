import { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/mobile/components/ui/use-toast';

interface RealtimeConfig {
  table: string;
  filter?: {
    column: string;
    eq?: string | number;
    in?: (string | number)[];
  };
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void;
}

export const useRealtimeData = (configs: RealtimeConfig[]) => {
  const [isConnected, setIsConnected] = useState(false);
  const { toast } = useToast();

  // Memoize configurations to prevent unnecessary re-renders
  const stableConfigs = useMemo(() => {
    return configs.map(config => ({
      ...config,
      // Create stable functions to prevent infinite re-renders
      onInsert: config.onInsert,
      onUpdate: config.onUpdate,
      onDelete: config.onDelete,
    }));
  }, [JSON.stringify(configs.map(c => ({ 
    table: c.table, 
    filter: c.filter 
  })))]);

  // Stable error handler
  const handleError = useCallback((table: string, error: any) => {
    console.error(`Error handling realtime event for ${table}:`, error);
    toast({
      title: "Real-time Error",
      description: `Failed to process update for ${table}`,
      variant: "destructive"
    });
  }, [toast]);

  // Stable connection error handler
  const handleConnectionError = useCallback((table: string) => {
    console.error(`❌ Real-time connection failed for ${table}`);
    toast({
      title: "Connection Error",
      description: `Failed to connect real-time updates for ${table}`,
      variant: "destructive"
    });
  }, [toast]);

  useEffect(() => {
    if (!stableConfigs.length) return;

    console.log('Setting up realtime channels for tables:', stableConfigs.map(c => c.table));
    
    // Create channels for each table configuration
    const channels = stableConfigs.map((config, index) => {
      const channelName = `realtime-${config.table}-${index}-${Date.now()}`;
      console.log(`Setting up realtime for table: ${config.table}`);
      
      let channelBuilder = supabase.channel(channelName);

      // Configure postgres changes listener
      let changeConfig: any = {
        event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
        schema: 'public',
        table: config.table
      };

      // Add filter if specified - with null validation
      if (config.filter) {
        if (config.filter.eq !== undefined && config.filter.eq !== null && config.filter.eq !== 'null' && config.filter.eq !== '') {
          changeConfig.filter = `${config.filter.column}=eq.${config.filter.eq}`;
        } else if (config.filter.in && config.filter.in.length > 0) {
          // Filter out null/invalid values from array
          const validValues = config.filter.in.filter(val => val !== null && val !== 'null' && val !== '' && val !== undefined);
          if (validValues.length > 0) {
            changeConfig.filter = `${config.filter.column}=in.(${validValues.join(',')})`;
          }
        }
      }

      channelBuilder = channelBuilder.on('postgres_changes', changeConfig, (payload) => {
        console.log(`Realtime event for ${config.table}:`, payload);
        console.log(`Realtime filter config:`, changeConfig);
        
        try {
          switch (payload.eventType) {
            case 'INSERT':
              config.onInsert?.(payload);
              break;
            case 'UPDATE':
              config.onUpdate?.(payload);
              break;
            case 'DELETE':
              config.onDelete?.(payload);
              break;
          }
        } catch (error) {
          handleError(config.table, error);
        }
      });

      return channelBuilder.subscribe((status) => {
        console.log(`Realtime status for ${config.table}:`, status);
        setIsConnected(status === 'SUBSCRIBED');
        
        if (status === 'SUBSCRIBED') {
          console.log(`✅ Real-time connected for ${config.table}`);
        } else if (status === 'CHANNEL_ERROR') {
          handleConnectionError(config.table);
        }
      });
    });

    // Cleanup function
    return () => {
      console.log('Cleaning up realtime channels...');
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
      setIsConnected(false);
    };
  }, [stableConfigs, handleError, handleConnectionError]);

  return { isConnected };
};

// Hook khusus untuk attendance data
export const useRealtimeAttendance = (organizationId: string, onDataChange?: () => void) => {
  const stableOnDataChange = useCallback(() => {
    onDataChange?.();
  }, [onDataChange]);

  // Validasi organizationId untuk mencegah error realtime
  const isValidUUID = organizationId && 
    typeof organizationId === 'string' &&
    organizationId !== 'null' && 
    organizationId !== 'undefined' && 
    organizationId !== 'skip' &&
    organizationId !== '' &&
    organizationId.length > 0 &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(organizationId);

  const configs = useMemo(() => {
    if (!isValidUUID) {
      // Only warn for actual invalid UUIDs, not placeholder values
      if (organizationId && organizationId !== 'skip' && organizationId !== 'null' && organizationId !== 'undefined') {
        console.warn('Invalid organizationId for realtime attendance:', organizationId);
      }
      return [];
    }
    
    return [
    {
      table: 'attendance_records',
      filter: { column: 'organization_id', eq: organizationId },
      onInsert: (payload: any) => {
        console.log('📡 New attendance record:', payload.new);
        stableOnDataChange();
      },
      onUpdate: (payload: any) => {
        console.log('📡 Updated attendance record:', payload.new);
        stableOnDataChange();
      },
      onDelete: (payload: any) => {
        console.log('📡 Deleted attendance record:', payload.old);
        stableOnDataChange();
      }
    },
    {
      table: 'attendance_penalties',
      filter: { column: 'organization_id', eq: organizationId },
      onInsert: (payload: any) => {
        console.log('📡 New penalty:', payload.new);
        stableOnDataChange();
      },
      onUpdate: (payload: any) => {
        console.log('📡 Updated penalty:', payload.new);
        stableOnDataChange();
      },
      onDelete: (payload: any) => {
        console.log('📡 Deleted penalty:', payload.old);
        stableOnDataChange();
      }
    }
    ];
  }, [organizationId, stableOnDataChange, isValidUUID]);

  return useRealtimeData(configs);
};

// Hook khusus untuk employee data
export const useRealtimeEmployees = (organizationId: string, onDataChange?: () => void) => {
  const stableOnDataChange = useCallback(() => {
    onDataChange?.();
  }, [onDataChange]);

  // Validasi organizationId untuk mencegah error realtime
  const isValidUUID = organizationId && 
    typeof organizationId === 'string' &&
    organizationId !== 'null' && 
    organizationId !== 'undefined' && 
    organizationId !== 'skip' &&
    organizationId !== '' &&
    organizationId.length > 0 &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(organizationId);

  const configs = useMemo(() => {
    if (!isValidUUID) {
      // Only warn for actual invalid UUIDs, not placeholder values
      if (organizationId && organizationId !== 'skip' && organizationId !== 'null' && organizationId !== 'undefined') {
        console.warn('Invalid organizationId for realtime employees:', organizationId);
      }
      return [];
    }
    
    return [
    {
      table: 'employees',
      filter: { column: 'organization_id', eq: organizationId },
      onInsert: (payload: any) => {
        console.log('New employee:', payload.new);
        stableOnDataChange();
      },
      onUpdate: (payload: any) => {
        console.log('Updated employee:', payload.new);
        stableOnDataChange();
      },
      onDelete: (payload: any) => {
        console.log('Deleted employee:', payload.old);
        stableOnDataChange();
      }
    }
    ];
  }, [organizationId, stableOnDataChange, isValidUUID]);

  return useRealtimeData(configs);
};

// Hook khusus untuk organization data
export const useRealtimeOrganization = (organizationId: string, onDataChange?: () => void) => {
  const stableOnDataChange = useCallback(() => {
    onDataChange?.();
  }, [onDataChange]);

  // Validasi organizationId untuk mencegah error realtime
  const isValidUUID = organizationId && 
    typeof organizationId === 'string' &&
    organizationId !== 'null' && 
    organizationId !== 'undefined' && 
    organizationId !== 'skip' &&
    organizationId !== '' &&
    organizationId.length > 0 &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(organizationId);

  const configs = useMemo(() => {
    if (!isValidUUID) {
      // Only warn for actual invalid UUIDs, not placeholder values
      if (organizationId && organizationId !== 'skip' && organizationId !== 'null' && organizationId !== 'undefined') {
        console.warn('Invalid organizationId for realtime organization:', organizationId);
      }
      return [];
    }
    
    return [
    {
      table: 'organizations',
      filter: { column: 'id', eq: organizationId },
      onUpdate: (payload: any) => {
        console.log('Updated organization:', payload.new);
        stableOnDataChange();
      }
    },
    {
      table: 'profiles',
      filter: { column: 'active_organization_id', eq: organizationId },
      onUpdate: (payload: any) => {
        console.log('Updated profile:', payload.new);
        stableOnDataChange();
      }
    }
    ];
  }, [organizationId, stableOnDataChange, isValidUUID]);

  return useRealtimeData(configs);
};