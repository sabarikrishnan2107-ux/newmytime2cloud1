import { useState, useEffect } from 'react';

export function useAttendanceSync(initialData = []) {
  const [availableItems, setAvailableItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [checkedItems, setCheckedItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSearchTerm, setSelectedSearchTerm] = useState('');

  // IMPORTANT: This syncs the hook when the API data arrives
  useEffect(() => {
    if (initialData && initialData.length > 0) {
      setAvailableItems(initialData);
      setCheckedItems([]);
      setSelectedItems([]);
    }
  }, [initialData]);

  const toggleCheck = (id) => {
    setCheckedItems(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const moveSelectedToRight = () => {
    const toMove = availableItems.filter(item => checkedItems.includes(item.id));
    if (toMove.length === 0) return;
    setSelectedItems(prev => [...prev, ...toMove]);
    setAvailableItems(prev => prev.filter(item => !checkedItems.includes(item.id)));
    setCheckedItems([]);
  };

  const moveSelectedToLeft = () => {
    const toMove = selectedItems.filter(item => checkedItems.includes(item.id));
    if (toMove.length === 0) return;
    setAvailableItems(prev => [...prev, ...toMove]);
    setSelectedItems(prev => prev.filter(item => !checkedItems.includes(item.id)));
    setCheckedItems([]);
  };

  const moveAllToRight = () => {
    setSelectedItems(prev => [...prev, ...availableItems]);
    setAvailableItems([]);
    setCheckedItems([]);
  };

  const moveAllToLeft = () => {
    setAvailableItems(prev => [...prev, ...selectedItems]);
    setSelectedItems([]);
    setCheckedItems([]);
  };

  const filteredAvailable = availableItems.filter(item =>
    item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.itemId?.toString().includes(searchTerm)
  );

  const filteredSelected = selectedItems.filter(item =>
    item.name?.toLowerCase().includes(selectedSearchTerm.toLowerCase()) ||
    item.itemId?.toString().includes(selectedSearchTerm)
  );

  return {
    available: filteredAvailable,
    selected: filteredSelected,
    checkedItems,
    searchTerm,
    setSearchTerm,
    selectedSearchTerm,
    setSelectedSearchTerm,
    toggleCheck,
    moveSelectedToRight,
    moveSelectedToLeft,
    moveAllToRight,
    moveAllToLeft
  };
}