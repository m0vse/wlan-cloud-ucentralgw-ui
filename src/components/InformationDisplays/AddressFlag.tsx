import * as React from 'react';
import ReactCountryFlag from 'react-country-flag';
import { isRFC1918 } from 'helpers/ipCountry';

type Props = { address?: string; country?: string; style?: React.CSSProperties };

const AddressFlag = ({ address = '', country = '', style }: Props) => {
  if (isRFC1918(address)) {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" style={style} role="img" aria-label="RFC1918">
        <title>RFC1918</title>
        <rect x="1" y="4" width="22" height="16" rx="2" fill="#e2e8f0" stroke="#718096" />
        <path d="M12 10v3M6 15v-2h12v2" fill="none" stroke="#2d3748" strokeWidth="1.4" />
        <g fill="#4a5568">
          <rect x="10" y="7" width="4" height="4" rx="0.7" />
          <rect x="4" y="15" width="4" height="3" rx="0.7" />
          <rect x="16" y="15" width="4" height="3" rx="0.7" />
        </g>
      </svg>
    );
  }
  return country ? <ReactCountryFlag style={style} countryCode={country} svg /> : null;
};

export default AddressFlag;
