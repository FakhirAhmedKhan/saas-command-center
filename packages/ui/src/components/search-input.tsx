import { Input } from './input';
import { Search } from 'lucide-react';
import { forwardRef, type InputHTMLAttributes } from 'react';

export interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput({ label, ...props }, ref) {
  return <Input ref={ref} type='search' label={label} leadingIcon={<Search className='size-4' aria-hidden='true' />} {...props} />;
});
