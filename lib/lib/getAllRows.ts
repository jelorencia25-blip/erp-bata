export async function getAllRows(
  supabase: any,
  table: string,
  select: string = "*",
  orderColumn?: string
) {

  let all:any[] = [];
  let from = 0;
  const batch = 1000;

  while (true) {

    let query = supabase
      .from(table)
      .select(select)
      .range(from, from + batch - 1);

    if (orderColumn) {
      query = query.order(orderColumn, { ascending: false });
    }

    const { data, error } = await query;

    if (error) throw error;

    if (!data || data.length === 0) break;

    all.push(...data);

    if (data.length < batch) break;

    from += batch;

  }

  return all;

}
