/* istanbul ignore file */
/* eslint-disable betterhabits/require-friendly-error-handler */
import { DOMAIN } from '@/config/domain.config';
import { getDb } from '@/db/sqlite';
import {
  deviceEntity,
  entryEntity,
  outbox,
  primaryEntity,
  reminderEntity,
} from '@/db/sqlite/schema';
import { ScreenContainer, SecondaryButton } from '@/ui';
import { pluralize } from '@/utils';
import { ChevronLeft, ChevronRight, Database } from '@tamagui/lucide-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Platform, ScrollView } from 'react-native';
import { Button, Card, Paragraph, Text, XStack, YStack } from 'tamagui';

type TableName =
  | typeof DOMAIN.entities.primary.tableName
  | typeof DOMAIN.entities.entries.tableName
  | typeof DOMAIN.entities.reminders.tableName
  | typeof DOMAIN.entities.devices.tableName
  | 'outbox';

const TABLE_CONFIGS = {
  [DOMAIN.entities.primary.tableName]: {
    entity: primaryEntity,
    label: pluralize(DOMAIN.entities.primary.displayName),
    icon: '📋',
  },
  [DOMAIN.entities.entries.tableName]: {
    entity: entryEntity,
    label: `${DOMAIN.entities.primary.displayName} ${pluralize(DOMAIN.entities.entries.displayName.toLowerCase())}`,
    icon: '✅',
  },
  [DOMAIN.entities.reminders.tableName]: {
    entity: reminderEntity,
    label: pluralize(DOMAIN.entities.reminders.displayName),
    icon: '⏰',
  },
  [DOMAIN.entities.devices.tableName]: {
    entity: deviceEntity,
    label: pluralize(DOMAIN.entities.devices.displayName),
    icon: '📱',
  },
  outbox: { entity: outbox, label: 'Outbox', icon: '📤' },
} as const;

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export default function DatabaseViewerScreen() {
  const router = useRouter();
  const [selectedTable, setSelectedTable] = useState<TableName>(DOMAIN.entities.primary.tableName);
  const [data, setData] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalPages = Math.ceil(totalCount / pageSize);
  const isNative = Platform.OS !== 'web';

  const fetchData = useCallback(async () => {
    if (!isNative) {
      setError('Database viewer is only available on native platforms.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const db = await getDb();
      const tableConfig = TABLE_CONFIGS[selectedTable];
      const offset = (currentPage - 1) * pageSize;

      // Fetch paginated data
      const records = await db.select().from(tableConfig.entity).limit(pageSize).offset(offset);

      // Fetch total count
      const countResult = await db.select().from(tableConfig.entity);
      const count = countResult.length;

      setData(records);
      setTotalCount(count);
    } catch (err) {
      console.error('[DatabaseViewer] Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      setData([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [selectedTable, currentPage, pageSize, isNative]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset to page 1 when table or page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTable, pageSize]);

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const renderTableData = () => {
    if (!data.length) {
      return (
        <Card bordered backgroundColor="$surface" padding="$4">
          <Paragraph textAlign="center" color="$colorMuted" fontSize="$4">
            No data found
          </Paragraph>
        </Card>
      );
    }

    const columns = Object.keys(data[0]);

    return (
      <ScrollView horizontal>
        <YStack gap="$2" minWidth="100%">
          {/* Header Row */}
          <XStack gap="$2" backgroundColor="$accentColor" padding="$2" borderRadius="$2">
            {columns.map((column) => (
              <YStack key={column} width={150} paddingHorizontal="$2">
                <Paragraph fontWeight="700" color="white" fontSize="$2">
                  {column}
                </Paragraph>
              </YStack>
            ))}
          </XStack>

          {/* Data Rows */}
          {data.map((row, rowIndex) => (
            <XStack
              key={rowIndex}
              gap="$2"
              backgroundColor={rowIndex % 2 === 0 ? '$surface' : '$background'}
              padding="$2"
              borderRadius="$2"
            >
              {columns.map((column) => (
                <YStack key={column} width={150} paddingHorizontal="$2">
                  <Paragraph fontSize="$2" color="$color" numberOfLines={2}>
                    {row[column] === null
                      ? 'null'
                      : typeof row[column] === 'object'
                        ? JSON.stringify(row[column])
                        : String(row[column])}
                  </Paragraph>
                </YStack>
              ))}
            </XStack>
          ))}
        </YStack>
      </ScrollView>
    );
  };

  if (!isNative) {
    return (
      <ScreenContainer>
        <YStack flex={1} justifyContent="center" alignItems="center" padding="$4">
          <Database size={64} color="$colorMuted" />
          <Paragraph fontSize="$5" fontWeight="700" marginTop="$4">
            Not Available on Web
          </Paragraph>
          <Paragraph color="$colorMuted" textAlign="center" marginTop="$2">
            Database viewer is only available on iOS and Android apps.
          </Paragraph>
          <SecondaryButton marginTop="$4" onPress={() => router.back()}>
            Go Back
          </SecondaryButton>
        </YStack>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer contentContainerStyle={{ flexGrow: 1, paddingBottom: 96 }}>
      <YStack gap="$4">
        {/* Table Selector & Page Size */}
        <Card bordered backgroundColor="$surface" padding="$4">
          <YStack gap="$3">
            <YStack gap="$2">
              <Paragraph fontWeight="600" fontSize="$4">
                Select Table
              </Paragraph>
              <YStack gap="$2">
                {(Object.keys(TABLE_CONFIGS) as TableName[]).map((tableName) => {
                  const config = TABLE_CONFIGS[tableName];
                  const isSelected = selectedTable === tableName;
                  return (
                    <Button
                      key={tableName}
                      size="$6"
                      height={56}
                      onPress={() => setSelectedTable(tableName)}
                      backgroundColor={isSelected ? '$accentColor' : '$surface'}
                      borderWidth={1}
                      borderColor="$borderColor"
                      justifyContent="flex-start"
                    >
                      <Text color={isSelected ? 'white' : '$color'} fontSize="$5">
                        {config.icon} {config.label}
                      </Text>
                    </Button>
                  );
                })}
              </YStack>
            </YStack>

            <YStack gap="$2">
              <Paragraph fontWeight="600" fontSize="$4">
                Items per page
              </Paragraph>
              <XStack gap="$2" flexWrap="wrap">
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <Button
                    key={size}
                    size="$4"
                    height={48}
                    flex={1}
                    minWidth={70}
                    onPress={() => setPageSize(size)}
                    backgroundColor={pageSize === size ? '$accentColor' : '$surface'}
                    borderWidth={1}
                    borderColor="$borderColor"
                  >
                    <Text color={pageSize === size ? 'white' : '$color'} fontSize="$4">
                      {size}
                    </Text>
                  </Button>
                ))}
              </XStack>
            </YStack>
          </YStack>
        </Card>

        {/* Stats */}
        <Card bordered backgroundColor="$surface" padding="$4">
          <XStack justifyContent="space-between" alignItems="center">
            <YStack>
              <Paragraph color="$colorMuted" fontSize="$2">
                Total Records
              </Paragraph>
              <Paragraph fontSize="$5" fontWeight="700">
                {totalCount}
              </Paragraph>
            </YStack>
            <YStack alignItems="flex-end">
              <Paragraph color="$colorMuted" fontSize="$2">
                Current Page
              </Paragraph>
              <Paragraph fontSize="$5" fontWeight="700">
                {currentPage} / {totalPages || 1}
              </Paragraph>
            </YStack>
          </XStack>
        </Card>

        {/* Error */}
        {error && (
          <Card bordered backgroundColor="$dangerBackground" padding="$4">
            <Paragraph color="$dangerColor">{error}</Paragraph>
          </Card>
        )}

        {/* Table Data */}
        <Card bordered backgroundColor="$background" padding="$4">
          {isLoading ? (
            <Paragraph textAlign="center" color="$colorMuted">
              Loading...
            </Paragraph>
          ) : (
            renderTableData()
          )}
        </Card>

        {/* Pagination Controls */}
        <Card bordered backgroundColor="$surface" padding="$4">
          <XStack gap="$3" alignItems="center">
            <Button
              size="$5"
              circular
              disabled={currentPage === 1 || isLoading}
              onPress={handlePreviousPage}
              backgroundColor={currentPage > 1 ? '$accentColor' : '$surface'}
              borderWidth={1}
              borderColor="$borderColor"
            >
              <ChevronLeft size={20} color={currentPage > 1 ? 'white' : '$color'} />
            </Button>

            <XStack flex={1} justifyContent="center">
              <Paragraph fontSize="$5" fontWeight="600">
                Page {currentPage} of {totalPages || 1}
              </Paragraph>
            </XStack>

            <Button
              size="$5"
              circular
              disabled={currentPage >= totalPages || isLoading || totalPages === 0}
              onPress={handleNextPage}
              backgroundColor={currentPage < totalPages ? '$accentColor' : '$surface'}
              borderWidth={1}
              borderColor="$borderColor"
            >
              <ChevronRight size={20} color={currentPage < totalPages ? 'white' : '$color'} />
            </Button>
          </XStack>
        </Card>

        {/* Info */}
        <Paragraph textAlign="center" color="$colorMuted" fontSize="$2" marginTop="$2">
          Showing {data.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{' '}
          {Math.min(currentPage * pageSize, totalCount)} of {totalCount} records
        </Paragraph>
      </YStack>
    </ScreenContainer>
  );
}
