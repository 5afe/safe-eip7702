import React, { useState } from "react";

interface AddressManagerProps {
  owners: string[];
  setOwners: React.Dispatch<React.SetStateAction<string[]>>;
}

const AddressManager: React.FC<AddressManagerProps> = ({ owners, setOwners }) => {
  const [newAddress, setNewAddress] = useState<string>("");

  // Handler to add a new address
  const addAddress = () => {
    if (newAddress && !owners.includes(newAddress)) {
      setOwners([...owners, newAddress]);
      setNewAddress(""); // Clear the input after adding
    }
  };

  // Handler to remove an address
  const removeAddress = (address: string) => {
    setOwners(owners.filter((owner) => owner !== address));
  };

  return (
    <div>
      <h4>Owners</h4>
      <ul>
        {owners.map((owner, index) => (
          <li key={index}>
            {owner}
            <button onClick={() => removeAddress(owner)}>Remove</button>
          </li>
        ))}
      </ul>

      <div>
        <input
          type="text"
          value={newAddress}
          onChange={(e) => setNewAddress(e.target.value)}
          placeholder="Enter new address"
        />
        <button onClick={addAddress}>Add Address</button>
      </div>
    </div>
  );
};

export default AddressManager;
