create table if not exists python_submissions (
    id bigint primary key generated always as identity,
    user_name text not null,
    code_input text not null,
    output text,
    error text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add indexes for common queries
create index if not exists python_submissions_user_name_idx on python_submissions(user_name);
create index if not exists python_submissions_created_at_idx on python_submissions(created_at); 