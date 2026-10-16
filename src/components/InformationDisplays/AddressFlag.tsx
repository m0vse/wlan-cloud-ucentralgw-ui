import * as React from 'react';
import ReactCountryFlag from 'react-country-flag';
import { isRFC1918 } from 'helpers/ipCountry';

type Props = { address?: string; country?: string; style?: React.CSSProperties };

const AddressFlag = ({ address = '', country = '', style }: Props) => {
  if (isRFC1918(address)) {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" style={{ borderRadius: '3px', ...style }} role="img" aria-label="RFC1918">
        <title>RFC1918</title>
        <rect width="24" height="24" fill="#2563eb" />
        <path d="M0 12h24v12H0z" fill="#0d9488" />
        <path d="M12 10v3M6 15v-2h12v2" fill="none" stroke="#fff" strokeWidth="1.5" />
        <g fill="#fff">
          <rect x="9.5" y="5.5" width="5" height="5" rx="1" />
          <rect x="3.5" y="15" width="5" height="4" rx="1" />
          <rect x="15.5" y="15" width="5" height="4" rx="1" />
        </g>
      </svg>
    );
  }
  return country ? <ReactCountryFlag style={style} countryCode={country} svg /> : null;
};

export default AddressFlag;
